"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ShiplockLogo from "@/components/ShiplockLogo";
import s from "./dashboard.module.css";

interface User {
  id: number;
  name: string;
  email: string;
  picture?: string;
  streak?: number;
  endorsements?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string;
  tech_stack?: string;
  deadline: string;
  createdAt?: string;
  totalTasks?: number;
  completedTasks?: number;
  calculatedProgress?: number;
}

interface Task {
  id: string;
  text: string;
  is_completed?: boolean;
  is_verifying?: boolean;
  verification_type?: "github" | "screenshot" | "file";
  verification_url?: string;
  is_saved?: boolean;
  complexity_points?: number;
}

interface DesignVerification {
  imagePreview: string | null;
  imageFile: File | null;
  isVerifying: boolean;
  result: {
    is_completed: boolean;
    confidence: number;
    reason: string;
  } | null;
  error: string | null;
}

const inferTaskVerificationType = (text: string): "github" | "screenshot" | "file" => {
  if (!text) return "github";
  const lowerText = text.toLowerCase();
  
  // Design / visual keywords
  if (lowerText.match(/\b(design|mockup|ui|ux|image|picture|photo|screenshot|figma|visual|look|layout)\b/)) {
    return "screenshot";
  }
  
  // File / document keywords
  if (lowerText.match(/\b(pdf|document|csv|excel|report|file|upload|asset|doc|presentation|slides)\b/)) {
    return "file";
  }

  // Default to code
  return "github";
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1); // 1 = Details, 2 = Workspace, 3 = Github, 4 = Boss Intro
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const currentProject = projects.find(p => p.id === currentProjectId);

  // Step 1: Project Details
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectTechStack, setNewProjectTechStack] = useState("");
  const [newProjectDeadline, setNewProjectDeadline] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Step 2: Project Workspace (Weekly Layout)
  const [activeWeek, setActiveWeek] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weekGoals, setWeekGoals] = useState<Record<number, string>>({});
  const [weekTasks, setWeekTasks] = useState<Record<number, Task[]>>({});
  const [isSavingTasks, setIsSavingTasks] = useState(false);
  const [isVerifyingGithub, setIsVerifyingGithub] = useState(false);

  // Design verification state (per-task)
  const [designVerifications, setDesignVerifications] = useState<Record<string, DesignVerification>>({});

  // Boss Intro State
  const [bossMessage, setBossMessage] = useState("");
  const [isGeneratingBoss, setIsGeneratingBoss] = useState(false);
  const [justCreatedProject, setJustCreatedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (projects.length > 0 && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("github_connected") === "true") {
        // Persist globally — one GitHub sync is enough for all projects
        localStorage.setItem("github_connected", "true");
        const projId = searchParams.get("project");
        if (projId) handleOpenWorkspace(projId, true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [projects]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("error")) {
        alert("GitHub Connection Failed: " + searchParams.get("error"));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
    } else {
      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser.id) {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        router.push("/");
        return;
      }
      setUser(parsedUser);
      fetch(`/api/projects?account_id=${parsedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.projects) {
            setProjects(data.projects.map((p: any) => ({
              id: p.id.toString(),
              name: p.name,
              description: p.description,
              techStack: p.tech_stack || "",
              deadline: p.deadline ? p.deadline.split('T')[0] : "",
              createdAt: p.created_at || new Date().toISOString()
            })));
          }
        })
        .catch(err => console.error(err));

      // Check for missed deadlines (Jokers Check)
      fetch("/api/check-jokers", {
        method: "POST",
        body: JSON.stringify({ userId: parsedUser.id }),
        headers: { "Content-Type": "application/json" }
      })
      .then(res => res.json())
      .then(checkData => {
        if (checkData.punished) {
          setBossMessage(checkData.message);
          setIsModalOpen(true);
          setModalStep(4); // Boss Intro / Punishment msg step
          
          // Update local storage to reflect punishment
          const updatedUser = { ...parsedUser, streak: 0, points: Math.max((parsedUser.points || 0) - 500, 0) };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      })
      .catch(err => console.error("Jokers check failed:", err));
    }
  }, [router]);
  
  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    router.push("/");
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalStep(1);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectTechStack("");
      setNewProjectDeadline("");
      setCurrentProjectId(null);
      setWeekGoals({});
      setWeekTasks({});
      setActiveWeek(1);
      setBossMessage("");
      setJustCreatedProject(null);
    }, 300);
  };

  const handleCreateProjectStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user) return;

    try {
      setIsSavingProject(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: user.id,
          name: newProjectName,
          description: newProjectDesc,
          tech_stack: newProjectTechStack,
          deadline: newProjectDeadline,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const createdProject: Project = {
        id: data.projectId.toString(),
        name: newProjectName,
        description: newProjectDesc,
        techStack: newProjectTechStack,
        deadline: newProjectDeadline,
        createdAt: new Date().toISOString(),
      };

      setProjects([createdProject, ...projects]);
      setJustCreatedProject(createdProject);
      setCurrentProjectId(createdProject.id);
      
      // Fetch boss intro
      setModalStep(4);
      setIsGeneratingBoss(true);
      fetch("/api/boss-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          tech_stack: newProjectTechStack,
          deadline: newProjectDeadline,
          userName: user.name
        })
      })
      .then(r => r.json())
      .then(data => setBossMessage(data.message))
      .catch(err => console.error("Failed to fetch boss intro:", err))
      .finally(() => setIsGeneratingBoss(false));

    } catch (err: any) {
      console.error(err);
      alert("Failed to create project: " + err.message);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleInitCreateProject = () => {
    setModalStep(1);
    setIsModalOpen(true);
  };

  // Switch to workspace mode and calculate weeks
  const handleOpenWorkspace = async (projectId: string, skipGithubCheck = false, newlyCreatedProject?: Project) => {
    const proj = newlyCreatedProject || projects.find(p => p.id === projectId);
    const isCodingProject = proj?.techStack && proj.techStack.trim().length > 0;
    const isGithubConnected = localStorage.getItem("github_connected");

    if (isCodingProject && !isGithubConnected && !skipGithubCheck) {
      setCurrentProjectId(projectId);
      setModalStep(3);
      setIsModalOpen(true);
      return;
    }

    setCurrentProjectId(projectId);
    setModalStep(2);
    setWeekGoals({});
    setWeekTasks({});
    setActiveWeek(1);
    setIsModalOpen(true);

    // Fetch existing tasks for this project
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}`);
      const data = await res.json();
      if (data.tasks) {
        const grouped: Record<number, Task[]> = {};
        data.tasks.forEach((t: any) => {
          if (!grouped[t.week_number]) grouped[t.week_number] = [];
          grouped[t.week_number].push({ 
            id: t.id.toString(), 
            text: t.text,
            is_completed: t.is_completed === 1 || t.is_completed === true,
            verification_type: t.verification_type,
            verification_url: t.verification_url,
            complexity_points: t.complexity_points,
            is_saved: true
          });
        });
        setWeekTasks(grouped);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const currentGoalText = weekGoals[activeWeek] || "";
  const currentTasksList = weekTasks[activeWeek] || [];

  const handleGenerateTasks = async () => {
    if (!currentGoalText.trim() || !currentProject) return;
    setIsGenerating(true);
    
    try {
      const res = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: currentGoalText,
          projectContext: {
            name: currentProject.name,
            description: currentProject.description,
            techStack: currentProject.techStack,
          },
          weekNumber: activeWeek
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to generate tasks via AI.");
      }

      if (data.tasks && Array.isArray(data.tasks)) {
        setWeekTasks(prev => ({
          ...prev,
          [activeWeek]: data.tasks.map((t: any, idx: number) => ({
            id: Date.now() + idx.toString(),
            text: t.text,
            complexity_points: t.complexity_points
          }))
        }));
      }

    } catch (err: any) {
      alert("AI Generation Error: " + err.message);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateTaskField = (taskId: string, field: keyof Task, value: any) => {
    setWeekTasks(prev => ({
      ...prev,
      [activeWeek]: prev[activeWeek].map(t => t.id === taskId ? { ...t, [field]: value } : t)
    }));
  };

  const handleToggleVerifyTask = (taskId: string) => {
    setWeekTasks(prev => ({
      ...prev,
      [activeWeek]: prev[activeWeek].map(t => {
        if (t.id === taskId) {
          if (t.is_completed) return { ...t, is_completed: false, verification_url: "", verification_type: undefined, is_verifying: false };
          
          const inferredType = t.verification_type || inferTaskVerificationType(t.text);
          return { ...t, is_verifying: !t.is_verifying, verification_type: inferredType };
        }
        return t;
      })
    }));
  };

  const handleDesignImageSelect = (taskId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setDesignVerifications(prev => ({
        ...prev,
        [taskId]: {
          imagePreview: e.target?.result as string,
          imageFile: file,
          isVerifying: false,
          result: null,
          error: null,
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDesignVerify = async (taskId: string) => {
    const dv = designVerifications[taskId];
    if (!dv?.imageFile || !currentProjectId) return;

    const task = currentTasksList.find(t => t.id === taskId);
    if (!task) return;

    setDesignVerifications(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], isVerifying: true, result: null, error: null }
    }));

    try {
      const formData = new FormData();
      formData.append("image", dv.imageFile);
      formData.append("task_id", taskId);
      formData.append("task_text", task.text);
      formData.append("project_id", currentProjectId);

      const res = await fetch("/api/verify-design", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }

      setDesignVerifications(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          isVerifying: false,
          result: {
            is_completed: data.is_completed,
            confidence: data.confidence,
            reason: data.reason,
          },
          error: null,
        }
      }));

      // If verified, update the task state
      if (data.is_completed) {
        setWeekTasks(prev => ({
          ...prev,
          [activeWeek]: prev[activeWeek].map(t => {
            if (t.id === taskId) {
              return { ...t, is_completed: true, is_verifying: false };
            }
            return t;
          })
        }));
      }
    } catch (err: any) {
      setDesignVerifications(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          isVerifying: false,
          result: null,
          error: err.message || "Verification failed",
        }
      }));
    }
  };

  const handleClearDesignUpload = (taskId: string) => {
    setDesignVerifications(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
  };

  const handleSubmitVerification = (taskId: string) => {
    setWeekTasks(prev => ({
      ...prev,
      [activeWeek]: prev[activeWeek].map(t => {
        if (t.id === taskId) {
          return { ...t, is_verifying: false, is_completed: true };
        }
        return t;
      })
    }));
  };

  const handleRemoveTask = (taskId: string) => {
    setWeekTasks(prev => ({
      ...prev,
      [activeWeek]: prev[activeWeek].filter(t => t.id !== taskId)
    }));
  };

  const handleAddTask = () => {
    setWeekTasks(prev => {
      const existing = prev[activeWeek] || [];
      return {
        ...prev,
        [activeWeek]: [...existing, { id: Date.now().toString(), text: "" }]
      };
    });
  };

  const handleSaveTasks = async () => {
    if (!currentProjectId) return;
    setIsSavingTasks(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: currentProjectId,
          week_number: activeWeek,
          tasks: currentTasksList
        })
      });
      if (!res.ok) throw new Error("Failed to save tasks");
      
      // Refetch tasks for this project to get updated complexity_points
      const refreshRes = await fetch(`/api/tasks?project_id=${currentProjectId}`);
      const refreshData = await refreshRes.json();
      if (refreshData.tasks) {
        const grouped: Record<number, Task[]> = {};
        refreshData.tasks.forEach((t: any) => {
          if (!grouped[t.week_number]) grouped[t.week_number] = [];
          grouped[t.week_number].push({ 
            id: t.id.toString(), 
            text: t.text,
            is_completed: t.is_completed === 1 || t.is_completed === true,
            verification_type: t.verification_type,
            verification_url: t.verification_url,
            complexity_points: t.complexity_points,
            is_saved: true
          });
        });
        setWeekTasks(grouped);
      }
      
      alert(`Tasks for Week ${activeWeek} synced to database!`);
    } catch (err: any) {
      console.error(err);
      alert("Error saving: " + err.message);
    } finally {
      setIsSavingTasks(false);
    }
  };

  const handleGlobalGithubSync = async () => {
    if (!currentProjectId || !user) return;
    setIsVerifyingGithub(true);
    try {
      const res = await fetch("/api/verify-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: currentProjectId,
          week_number: activeWeek,
          account_id: user.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify tasks");
      
      alert(data.message || "Verification complete!");
      // Reload the tasks directly from the API to update UI
      const refreshRes = await fetch(`/api/tasks?project_id=${currentProjectId}`);
      const refreshData = await refreshRes.json();
      if (refreshData.tasks) {
        const grouped: Record<number, Task[]> = {};
        refreshData.tasks.forEach((t: any) => {
          if (!grouped[t.week_number]) grouped[t.week_number] = [];
          grouped[t.week_number].push({ 
            id: t.id.toString(), 
            text: t.text,
            is_completed: t.is_completed === 1 || t.is_completed === true,
            verification_type: t.verification_type,
            verification_url: t.verification_url,
            complexity_points: t.complexity_points,
            is_saved: true
          });
        });
        setWeekTasks(grouped);
      }
    } catch (err: any) {
      alert("Verification Error: " + err.message);
    } finally {
      setIsVerifyingGithub(false);
    }
  };

  const getWeeksCount = (deadlineStr?: string, createdAtStr?: string) => {
    const start = createdAtStr ? new Date(createdAtStr) : new Date();
    
    // We calculate weeks based on whichever is further: the original deadline, or TODAY.
    // This allows the project to naturally "extend" into new weeks if delayed.
    const originalDeadline = deadlineStr ? new Date(deadlineStr) : new Date(start.getTime() + 4 * 7 * 24 * 60 * 60 * 1000); // default 4w
    
    const now = new Date();
    // If today is past the deadline, we use today as the end point to stretch the weeks out
    const effectiveEndTime = now > originalDeadline ? now : originalDeadline;
    
    const diffTime = effectiveEndTime.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let weeks = Math.ceil(diffDays / 7);
    
    if (weeks <= 0) return 1;
    if (weeks > 52) return 52; // Cap at 1 year rather than 12 weeks to allow long delays
    return weeks;
  };

  const totalWeeks = getWeeksCount(currentProject?.deadline, currentProject?.createdAt);

  // ── Deadline System: Cascading Debt (Option C) ──────────────────
  const getWeekDeadline = (weekNum: number): Date => {
    const start = currentProject?.createdAt || new Date().toISOString();
    const deadline = new Date(new Date(start).getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    deadline.setDate(deadline.getDate() + 6);
    deadline.setHours(12, 0, 0, 0);
    return deadline;
  };

  const isWeekOverdue = (weekNum: number): boolean => {
    return new Date() > getWeekDeadline(weekNum);
  };

  const isWeekDone = (weekNum: number): boolean => {
    const tasks = weekTasks[weekNum] || [];
    return tasks.length > 0 && tasks.every(t => t.is_completed);
  };

  // Collect incomplete tasks from all past overdue weeks (debt)
  const getDebtTasks = (forWeek: number): { weekNum: number; task: Task }[] => {
    const debt: { weekNum: number; task: Task }[] = [];
    for (let w = 1; w < forWeek; w++) {
      if (isWeekOverdue(w) && !isWeekDone(w)) {
        const tasks = weekTasks[w] || [];
        tasks.filter(t => !t.is_completed).forEach(t => {
          debt.push({ weekNum: w, task: t });
        });
      }
    }
    return debt;
  };

  const currentDebt = getDebtTasks(activeWeek);
  const totalDebtCount = currentDebt.length;

  // Project health based on debt accumulation
  type ProjectHealth = 'on_track' | 'at_risk' | 'critical';
  const getProjectHealth = (): { status: ProjectHealth; label: string; color: string; bg: string; border: string; icon: string } => {
    // Count total incomplete tasks across all overdue weeks
    let totalIncomplete = 0;
    for (let w = 1; w <= totalWeeks; w++) {
      if (isWeekOverdue(w) && !isWeekDone(w)) {
        const tasks = weekTasks[w] || [];
        totalIncomplete += tasks.filter(t => !t.is_completed).length;
      }
    }
    // Count how many weeks have been fully failed (entire week overdue with 0 completions)
    let failedWeeks = 0;
    for (let w = 1; w <= totalWeeks; w++) {
      const tasks = weekTasks[w] || [];
      if (isWeekOverdue(w) && tasks.length > 0 && tasks.every(t => !t.is_completed)) {
        failedWeeks++;
      }
    }

    if (failedWeeks >= 2 || totalIncomplete >= 6) {
      return { status: 'critical', label: 'CRITICAL', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', icon: '🔴' };
    }
    if (failedWeeks >= 1 || totalIncomplete >= 3) {
      return { status: 'at_risk', label: 'AT RISK', color: '#92400e', bg: '#fffbeb', border: '#fcd34d', icon: '🟡' };
    }
    return { status: 'on_track', label: 'ON TRACK', color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7', icon: '🟢' };
  };

  const getBossWarning = (): string | null => {
    const health = getProjectHealth();
    if (health.status === 'critical') {
      return `You have ${totalDebtCount} overdue tasks piling up. This project is heading for failure. Get it together NOW.`;
    }
    if (health.status === 'at_risk') {
      return `${totalDebtCount} tasks carried over from previous weeks. Clear your debt before it snowballs.`;
    }
    return null;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  if (!user) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
        Loading...
      </div>
    );
  }



  return (
    <div className={s.container}>
      {/* ── Header ── */}
      <header className={s.header}>
        <div className={s.brandGroup}>
          <h1 className={s.brandTextProjects} style={{ display: 'flex', alignItems: 'center' }}>
            <ShiplockLogo vertical={false} style={{ width: '320px', height: 'auto', color: '#000' }} />
          </h1>
        </div>
        
        <div className={s.headerRight}>
          <button className={s.btnPrimaryBlack} onClick={handleInitCreateProject}>
            Create Project
          </button>
          <button className={s.btnSecondary} onClick={handleLogout} style={{ gap: '8px', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log out
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main>
        {projects.length === 0 ? (
          <motion.div className={s.emptyState} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <h3>No projects yet</h3>
            <p>You haven&apos;t created any projects yet. Create your first project to start collaborating.</p>
            <button className={s.btnPrimary} onClick={handleInitCreateProject}>
              Create your first project
            </button>
          </motion.div>
        ) : (
          <motion.div className={s.projectListWrapper} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={s.projectListContainer}>
              {projects.map((project, i) => {
                // actual visual percentage passed precisely from the backend using the prorated method
                const actualProgress = project.calculatedProgress || 0;
                
                const phaseLabel = project.techStack || project.tech_stack || "Development Phase";
                const description = project.description || "No project description provided.";

                // Format the deadline
                let deadlineText = "";
                if (project.deadline) {
                  const dObj = new Date(project.deadline);
                  deadlineText = `Deadline: ${dObj.toLocaleDateString()}`;
                }

                return (
                  <div key={project.id} className={s.projectRow} onClick={() => handleOpenWorkspace(project.id)}>
                    <div className={s.projectRowLeft}>
                      <h3 className={s.projectRowTitle}>{project.name}</h3>
                      <div className={s.projectRowPhase}>{phaseLabel}</div>
                      <div className={s.projectRowDesc}>
                        {description}
                      </div>
                      {deadlineText && (
                        <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600, marginTop: "4px" }}>
                          {deadlineText}
                        </div>
                      )}
                    </div>
                    <div className={s.projectRowRight}>
                      <div className={s.progressSection}>
                        <div className={s.progressHeader}>
                          <span className={s.progressLabel}>PROGRESS</span>
                          <span className={s.progressValue}>{actualProgress}%</span>
                        </div>
                        <div className={s.progressBarTrack}>
                          <div className={s.progressBarFill} style={{ width: `${actualProgress}%` }}></div>
                        </div>
                      </div>
                      <div className={s.projectRowChevron}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Link href="/leaderboard" className={s.jokersSection} style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
                <div className={s.jokersTextLine1}>SEE THE <span className={s.jokersTextHighlight} style={{ color: '#3b82f6' }}>LEGENDS</span> OF</div>
                <div className={s.jokersTextLine2}>THIS MONTH</div>
              </Link>

              <Link href="/jokers" className={s.jokersSection} style={{ textDecoration: 'none', cursor: 'pointer', display: 'block', marginTop: '-40px' }}>
                <div className={s.jokersTextLine1} style={{ color: '#f1f5f9' }}>THE PUBLIC <span className={s.jokersTextHighlight} style={{ color: '#ef4444' }}>JOKER</span> WALL</div>
                <div className={s.jokersTextLine2} style={{ color: '#f1f5f9' }}>OF FAILURES</div>
              </Link>
            </div>
          </motion.div>
        )}
      </main>

      {/* ── Modals Overlay ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div className={s.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            
            {/* Modal Step 1: Base Creation */}
            {modalStep === 1 && (
              <motion.div className={s.modalCard} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className={s.modalHeader}>
                  <h2>Create New Project</h2>
                  <button className={s.closeBtn} onClick={resetModal}><svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>
                <form onSubmit={handleCreateProjectStep1}>
                  <div className={s.modalBody}>
                    <div className={s.formGroup}>
                      <label htmlFor="projectName">Project name</label>
                      <input id="projectName" type="text" placeholder="e.g. Website Redesign" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} autoFocus />
                    </div>
                    <div className={s.formGroup}>
                      <label htmlFor="projectDesc">Description (optional)</label>
                      <textarea id="projectDesc" placeholder="Briefly describe what this project is about..." value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} />
                    </div>
                    <div className={s.formGroup}>
                      <label htmlFor="techStack">Tech Stack</label>
                      <input id="techStack" type="text" placeholder="e.g. Next.js, Tailwind, MySQL" value={newProjectTechStack} onChange={(e) => setNewProjectTechStack(e.target.value)} />
                    </div>
                    <div className={s.formGroup} style={{ marginBottom: 0 }}>
                      <label htmlFor="deadline">Launch Deadline</label>
                      <input id="deadline" type="date" value={newProjectDeadline} onChange={(e) => setNewProjectDeadline(e.target.value)} />
                    </div>
                  </div>
                  <div className={s.modalFooter}>
                    <button type="button" className={s.btnSecondary} onClick={resetModal}>Cancel</button>
                    <button type="submit" className={s.btnPrimary} disabled={!newProjectName.trim() || isSavingProject}>{isSavingProject ? "Creating..." : "Create Project"}</button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Modal Step 4: Boss Intro */}
            {modalStep === 4 && (
              <motion.div className={s.modalCard} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                <div className={s.modalHeader} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>Secure Channel <span style={{ color: 'var(--accent)' }}>[ESTABLISHED]</span></h2>
                </div>
                <div className={s.modalBody} style={{ padding: "40px", backgroundColor: "#fafafc", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", marginBottom: "32px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                    YB
                  </div>
                  {isGeneratingBoss ? (
                    <div style={{ color: "var(--text-secondary)", fontSize: "15px", fontStyle: "italic", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div className={s.spinner} style={{ margin: 0 }}></div>
                      Decrypting incoming message...
                    </div>
                  ) : (
                    <div style={{ fontSize: "17px", lineHeight: "1.7", fontWeight: 400, color: "var(--text-primary)", textAlign: "left", width: "100%", background: "#fff", border: "1px solid var(--border)", padding: "28px", borderRadius: "12px", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <div style={{ position: "absolute", top: "-10px", left: "24px", background: "var(--accent)", color: "#fff", padding: "4px 10px", fontSize: "10px", fontWeight: "bold", borderRadius: "6px", letterSpacing: "0.5px" }}>EXECUTIVE ORDER</div>
                      "{bossMessage}"
                    </div>
                  )}
                </div>
                <div className={s.modalFooter} style={{ justifyContent: "center", background: "#fff", borderTop: "1px solid var(--border)", padding: "24px" }}>
                  <button type="button" className={s.btnPrimary} style={{ width: "100%", padding: "16px", fontSize: "15px", fontWeight: 600 }} disabled={isGeneratingBoss} onClick={() => {
                    if (justCreatedProject) handleOpenWorkspace(justCreatedProject.id, false, justCreatedProject);
                  }}>
                    {isGeneratingBoss ? "Waiting..." : "Yes, Boss."}
                  </button>
                </div>
              </motion.div>
            )}
            {/* Modal Step 3: Github Connection */}
            {modalStep === 3 && currentProject && (
              <motion.div className={s.modalCard} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className={s.modalHeader}>
                  <h2>Connect GitHub</h2>
                  <button className={s.closeBtn} onClick={resetModal}><svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>
                <div className={s.modalBody} style={{ padding: "32px", textAlign: "center" }}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ marginBottom: "16px" }}>
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>Connect your GitHub Account</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5", marginBottom: "24px" }}>
                    Since this is a coding project, YesBoss needs to connect to your GitHub account to track your progress and verify task completion via Pull Requests and Commits.
                  </p>
                </div>
                <div className={s.modalFooter} style={{ justifyContent: "center", gap: "12px", paddingBottom: "24px" }}>
                  <button type="button" className={s.btnPrimary} onClick={() => {
                     window.location.href = `/api/auth/github?projectId=${currentProjectId}&accountId=${user?.id}`;
                  }}>Authorize OAuth App</button>
                </div>
              </motion.div>
            )}

            {/* Modal Step 2: Advanced Weekly Workspace */}
            {modalStep === 2 && currentProject && (
              <motion.div className={`${s.modalCard} ${s.modalCardWorkspace}`} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className={s.modalHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "20px" }}>{currentProject.name}</h2>
                    <span style={{ fontSize: "12px", background: "rgba(0,0,0,0.06)", padding: "4px 8px", borderRadius: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Workspace</span>
                  </div>
                  <div style={{ marginRight: '40px' }}>
                    {(() => {
                      const projHealth = getProjectHealth();
                      const deadline = getWeekDeadline(activeWeek);
                      const now = new Date();
                      const diff = deadline.getTime() - now.getTime();
                      const isOverdue = diff < 0;
                      const isUrgent = diff > 0 && diff < (24 * 60 * 60 * 1000);
                      
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                      const isDone = isWeekDone(activeWeek);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: projHealth.bg, border: `1px solid ${projHealth.border}`, padding: '4px 10px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '12px' }}>{projHealth.icon}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: projHealth.color, letterSpacing: '0.5px' }}>{projHealth.label}</span>
                          </div>
                          
                          <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: isDone ? '#10b981' : isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : 'var(--text-secondary)' }}>
                              {isDone ? "WEEK COMPLETED" : isOverdue ? "WEEK FAILED" : isUrgent ? "FINAL 24H WARNING" : "WEEK DEADLINE:"}
                            </span>
                            <span style={{ 
                              fontSize: '13px', 
                              fontWeight: 700, 
                              color: isDone ? '#064e3b' : isOverdue ? '#7f1d1d' : isUrgent ? '#78350f' : '#10b981',
                              background: isDone ? '#d1fae5' : isOverdue ? '#fef2f2' : isUrgent ? '#fef3c7' : '#ecfdf5',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: `1px solid ${isDone ? '#6ee7b7' : isOverdue ? '#fecaca' : isUrgent ? '#fcd34d' : '#bbf7d0'}`
                            }}>
                              {isDone ? "Success" : isOverdue ? "Past 7th Day 12PM" : `${days}d ${hours}h left`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <button className={s.closeBtn} onClick={resetModal}><svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>

                <div className={s.workspaceBody}>
                  {/* Left Sidebar (Weeks Map) */}
                  <div className={s.sidebar}>
                    <div className={s.sidebarHeader}>Project Timeline</div>
                    <div className={s.weeksList}>
                      {Array.from({ length: totalWeeks }).map((_, idx) => {
                        const weekNum = idx + 1;
                        const hasTasks = (weekTasks[weekNum] || []).length > 0;
                        const debtCount = getDebtTasks(weekNum + 1).filter(d => d.weekNum === weekNum).length;
                        return (
                          <div 
                            key={weekNum} 
                            onClick={() => setActiveWeek(weekNum)}
                            className={`${s.weekItem} ${activeWeek === weekNum ? s.active : ""}`}
                          >
                            <span>
                              Week {weekNum}
                              {debtCount > 0 && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>({debtCount} missing)</span>}
                            </span>
                            {(() => {
                              if (isWeekDone(weekNum)) return <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>DONE</span>;
                              if (isWeekOverdue(weekNum)) return <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>FAILED</span>;
                              return hasTasks ? <span style={{ width: "6px", height: "6px", background: "var(--accent)", borderRadius: "50%" }} /> : null;
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Content Area (Weekly Copilot View) */}
                  <div className={s.workspaceContent}>
                    
                    {/* Boss Escalation Warning */}
                    {getBossWarning() && (
                      <div style={{ 
                        margin: '0 0 24px', 
                        padding: '16px 20px', 
                        background: getProjectHealth().status === 'critical' ? '#fef2f2' : '#fffbeb', 
                        borderLeft: `4px solid ${getProjectHealth().status === 'critical' ? '#dc2626' : '#d97706'}`,
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ 
                          width: '32px', height: '32px', 
                          background: getProjectHealth().status === 'critical' ? '#dc2626' : '#d97706',
                          color: '#fff', borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '14px'
                        }}>YB</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: getProjectHealth().status === 'critical' ? '#991b1b' : '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Boss Notification
                          </div>
                          <div style={{ fontSize: '14px', color: getProjectHealth().status === 'critical' ? '#b91c1c' : '#b45309', lineHeight: 1.5 }}>
                            "{getBossWarning()}"
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Goal Prompter */}
                    <div className={s.goalSection}>
                      <h3>AI Task Generation - Week {activeWeek}</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
                        Describe exactly what progress you want to see completed by the end of Week {activeWeek}. Our AI will break it down into simple, actionable chunks for you.
                      </p>
                      
                      <div className={s.formGroup}>
                        <textarea 
                          placeholder="e.g. We need to finalize the entire authentication flow including Google login, standard sign up, and password resets."
                          value={currentGoalText}
                          onChange={(e) => setWeekGoals({ ...weekGoals, [activeWeek]: e.target.value })}
                          style={{ minHeight: "80px", marginBottom: "12px", border: "1px dashed var(--border)" }}
                        />
                        <button 
                          className={s.btnPrimary} 
                          onClick={handleGenerateTasks}
                          disabled={isGenerating || !currentGoalText.trim()}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                          Draft Week {activeWeek} Tasks
                        </button>
                      </div>
                    </div>

                    {/* Results / Existing Tasks Section */}
                    {isGenerating ? (
                      <div className={s.generatingOverlay}>
                        <div className={s.spinner}></div>
                        <span style={{ fontSize: "15px", fontWeight: 500 }}>Generating task pipeline...</span>
                      </div>
                    ) : (
                      currentTasksList.length > 0 && (
                        <div className={s.tasksBlock}>
                          <div className={s.tasksHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0 }}>Your Action Items for Week {activeWeek}</h3>
                            <button 
                              type="button" 
                              className={s.btnSecondary} 
                              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", fontSize: "13px", color: "var(--text-primary)" }}
                              onClick={handleGlobalGithubSync}
                              disabled={isVerifyingGithub}
                            >
                              {isVerifyingGithub ? (
                                <div className={s.spinner} style={{ width: "14px", height: "14px", margin: 0, borderWidth: "2px" }} />
                              ) : (
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                </svg>
                              )}
                              {isVerifyingGithub ? "AI Analyzing Diffs..." : "Verify through GitHub"}
                            </button>
                          </div>
                          
                          <div className={s.formGroup}>
                            
                            {/* Debt Tasks Section */}
                            {currentDebt.length > 0 && (
                              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px dashed var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="#dc2626" fill="none" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                  <h4 style={{ margin: 0, color: '#dc2626', fontSize: '15px' }}>Debt: Rolled Over from Previous Weeks</h4>
                                </div>
                                {currentDebt.map(({ weekNum, task }) => (
                                  <div key={task.id} className={s.taskItem} style={{ borderLeft: '3px solid #dc2626', background: '#fef2f2' }}>
                                    <div className={s.taskIcon}>
                                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="#dc2626" fill="none" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="10" />
                                      </svg>
                                    </div>
                                    <div className={s.taskContentWrapper}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginBottom: '4px', textTransform: 'uppercase' }}>Failed in Week {weekNum}</span>
                                        <div style={{ fontSize: '15px', color: '#991b1b', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          {task.text}
                                          {task.complexity_points && (
                                            <span style={{ fontSize: "11px", fontWeight: "bold", background: "#fef2f2", padding: "2px 6px", borderRadius: "12px", border: "1px solid #fca5a5", color: "#dc2626" }}>
                                              {task.complexity_points} pts
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div style={{ marginTop: '12px' }}>
                                        <button type="button" onClick={() => setActiveWeek(weekNum)} className={s.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', background: '#fff', borderColor: '#fca5a5', color: '#b91c1c' }}>
                                          Go to Week {weekNum} to complete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Current Week Tasks */}
                            {currentTasksList.map((task) => (
                              <div key={task.id} className={`${s.taskItem} ${task.is_completed ? s.completed : ""}`}>
                                <div className={`${s.taskIcon} ${task.is_completed ? s.taskIconComplete : ""}`}>
                                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
                                    {task.is_completed ? (
                                      <><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></>
                                    ) : (
                                      <circle cx="12" cy="12" r="10" />
                                    )}
                                  </svg>
                                </div>
                                <div className={s.taskContentWrapper}>
                                  <div className={s.taskInput} style={{ display: "flex", alignItems: "center", width: "100%", gap: "8px" }}>
                                    <input 
                                      type="text"
                                      value={task.text}
                                      onChange={(e) => handleUpdateTaskField(task.id, "text", e.target.value)}
                                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "15px", margin: 0, padding: "2px 0", color: "var(--text-primary)" }}
                                      readOnly={task.is_saved || task.is_completed}
                                    />
                                    
                                    {task.complexity_points && (
                                      <span style={{ fontSize: "11px", fontWeight: "bold", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px", border: "1px solid #cbd5e1", color: "#475569", flexShrink: 0 }}>
                                        {task.complexity_points} pts
                                      </span>
                                    )}

                                    {task.is_saved && !task.is_completed ? (
                                      <button 
                                        type="button" 
                                        className={s.btnSecondary} 
                                        style={{ padding: "6px 12px", fontSize: "12px", borderColor: "var(--accent)", color: "var(--accent)" }}
                                        onClick={() => handleToggleVerifyTask(task.id)}
                                      >
                                        {task.is_verifying ? "Cancel" : "Submit"}
                                      </button>
                                    ) : !task.is_saved ? (
                                      <button type="button" onClick={() => handleRemoveTask(task.id)} className={s.removeTaskBtn} title="Remove task">
                                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                      </button>
                                    ) : null}
                                  </div>

                                  {task.is_verifying && !task.is_completed && (
                                    <div className={s.verifyPanel}>
                                      <div style={{ marginBottom: "12px" }}>
                                        <h4 style={{ margin: 0 }}>Verify Completion</h4>
                                      </div>
                                      
                                      <div className={s.formGroup} style={{ marginBottom: "12px" }}>
                                        {task.verification_type === "screenshot" ? (
                                          <div>
                                            {/* Image Upload / Preview Area */}
                                            {!designVerifications[task.id]?.imagePreview ? (
                                              <div 
                                                style={{ padding: "24px 16px", border: "2px dashed var(--border)", borderRadius: "12px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)", background: "#fff", cursor: "pointer", transition: "all 0.2s" }} 
                                                onClick={() => document.getElementById(`file-${task.id}`)?.click()}
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#f0f7ff'; }}
                                                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
                                                onDrop={(e) => {
                                                  e.preventDefault();
                                                  e.currentTarget.style.borderColor = 'var(--border)';
                                                  e.currentTarget.style.background = '#fff';
                                                  const file = e.dataTransfer.files[0];
                                                  if (file && file.type.startsWith('image/')) handleDesignImageSelect(task.id, file);
                                                }}
                                              >
                                                <input 
                                                  type="file" 
                                                  accept="image/*" 
                                                  style={{ display: 'none' }} 
                                                  id={`file-${task.id}`} 
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDesignImageSelect(task.id, file);
                                                  }}
                                                />
                                                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 12px", opacity: 0.6 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>Upload Design Screenshot</div>
                                                <div style={{ fontSize: "12px", marginTop: "6px", lineHeight: 1.5 }}>Drag & drop or click to browse<br/>GPT-4o Vision will verify your work</div>
                                              </div>
                                            ) : (
                                              <div style={{ position: 'relative' }}>
                                                {/* Image Preview */}
                                                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
                                                  <img 
                                                    src={designVerifications[task.id].imagePreview!} 
                                                    alt="Uploaded design" 
                                                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                                                  />
                                                </div>
                                                
                                                {/* Clear button */}
                                                {!designVerifications[task.id]?.isVerifying && !designVerifications[task.id]?.result?.is_completed && (
                                                  <button 
                                                    type="button"
                                                    onClick={() => handleClearDesignUpload(task.id)}
                                                    style={{ 
                                                      position: 'absolute', top: '8px', right: '8px',
                                                      width: '28px', height: '28px', borderRadius: '50%',
                                                      background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                      fontSize: '14px', fontWeight: 'bold'
                                                    }}
                                                    title="Remove image"
                                                  >
                                                    ✕
                                                  </button>
                                                )}

                                                {/* Verification Status */}
                                                {designVerifications[task.id]?.isVerifying && (
                                                  <div style={{ 
                                                    marginTop: '12px', padding: '16px', borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
                                                    border: '1px solid #c4d7f2',
                                                    display: 'flex', alignItems: 'center', gap: '12px'
                                                  }}>
                                                    <div className={s.spinner} style={{ width: '20px', height: '20px', margin: 0, borderWidth: '2px' }} />
                                                    <div>
                                                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1a56db' }}>AI Analyzing Your Design...</div>
                                                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>GPT-4o Vision is reviewing your screenshot</div>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Verification Result */}
                                                {designVerifications[task.id]?.result && (
                                                  <div style={{ 
                                                    marginTop: '12px', padding: '16px', borderRadius: '10px',
                                                    background: designVerifications[task.id].result!.is_completed 
                                                      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' 
                                                      : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                                                    border: `1px solid ${designVerifications[task.id].result!.is_completed ? '#6ee7b7' : '#fca5a5'}`,
                                                  }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                      <span style={{ fontSize: '18px' }}>
                                                        {designVerifications[task.id].result!.is_completed ? '✅' : '❌'}
                                                      </span>
                                                      <span style={{ 
                                                        fontWeight: 700, fontSize: '14px', 
                                                        color: designVerifications[task.id].result!.is_completed ? '#065f46' : '#991b1b' 
                                                      }}>
                                                        {designVerifications[task.id].result!.is_completed ? 'Task Verified!' : 'Not Verified'}
                                                      </span>
                                                      <span style={{ 
                                                        marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
                                                        background: designVerifications[task.id].result!.is_completed ? '#065f46' : '#991b1b',
                                                        color: '#fff', padding: '2px 8px', borderRadius: '10px'
                                                      }}>
                                                        {designVerifications[task.id].result!.confidence}% confidence
                                                      </span>
                                                    </div>
                                                    <div style={{ 
                                                      fontSize: '12.5px', lineHeight: 1.5, 
                                                      color: designVerifications[task.id].result!.is_completed ? '#047857' : '#b91c1c',
                                                      fontStyle: 'italic'
                                                    }}>
                                                      "{designVerifications[task.id].result!.reason}"
                                                    </div>
                                                    {!designVerifications[task.id].result!.is_completed && (
                                                      <button 
                                                        type="button" 
                                                        onClick={() => handleClearDesignUpload(task.id)}
                                                        style={{ 
                                                          marginTop: '10px', background: 'none', border: '1px solid #fca5a5',
                                                          color: '#991b1b', padding: '6px 14px', borderRadius: '6px',
                                                          fontSize: '12px', cursor: 'pointer', fontWeight: 500
                                                        }}
                                                      >
                                                        Try with a different image
                                                      </button>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Error */}
                                                {designVerifications[task.id]?.error && (
                                                  <div style={{ 
                                                    marginTop: '12px', padding: '12px', borderRadius: '8px',
                                                    background: '#fef2f2', border: '1px solid #fecaca',
                                                    fontSize: '12.5px', color: '#b91c1c'
                                                  }}>
                                                    ⚠️ {designVerifications[task.id].error}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ) : task.verification_type === "file" ? (
                                          <div style={{ padding: "16px", border: "2px dashed var(--border)", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)", background: "#fff", cursor: "pointer", transition: "all 0.2s" }} onClick={() => document.getElementById(`doc-${task.id}`)?.click()}>
                                            <input type="file" style={{ display: 'none' }} id={`doc-${task.id}`} onClick={(e) => e.stopPropagation()} />
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ margin: "0 auto 8px" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>Upload Required File</div>
                                            <div style={{ fontSize: "11px", marginTop: "4px" }}>Click to browse files</div>
                                          </div>
                                        ) : (
                                          <div style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "var(--text-primary)", background: "#f8fafc" }}>
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ margin: "0 auto 8px" }}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                                            <div style={{ fontWeight: 500 }}>Code Task</div>
                                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>Code tasks are verified automatically via global GitHub Sync based on your commits.</div>
                                          </div>
                                        )}
                                      </div>

                                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "12px", display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                                        <span>Not {task.verification_type}? Change to:</span>
                                        {task.verification_type !== 'github' && <button type="button" onClick={() => handleUpdateTaskField(task.id, "verification_type", "github")} style={{ border: 'none', background: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Code</button>}
                                        {task.verification_type !== 'screenshot' && <button type="button" onClick={() => handleUpdateTaskField(task.id, "verification_type", "screenshot")} style={{ border: 'none', background: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Image/Design</button>}
                                        {task.verification_type !== 'file' && <button type="button" onClick={() => handleUpdateTaskField(task.id, "verification_type", "file")} style={{ border: 'none', background: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>File</button>}
                                      </div>

                                      {task.verification_type === "screenshot" ? (
                                        <button 
                                          type="button" 
                                          className={s.btnPrimary} 
                                          style={{ 
                                            width: "100%", padding: "12px", fontSize: "13px",
                                            background: designVerifications[task.id]?.imagePreview 
                                              ? 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)' 
                                              : undefined,
                                            opacity: !designVerifications[task.id]?.imagePreview || designVerifications[task.id]?.isVerifying ? 0.6 : 1
                                          }}
                                          onClick={() => handleDesignVerify(task.id)}
                                          disabled={!designVerifications[task.id]?.imagePreview || designVerifications[task.id]?.isVerifying}
                                        >
                                          {designVerifications[task.id]?.isVerifying 
                                            ? "⏳ AI Verifying..." 
                                            : designVerifications[task.id]?.result?.is_completed 
                                              ? "✅ Verified by AI"
                                              : designVerifications[task.id]?.imagePreview 
                                                ? "🔍 Verify with GPT-4o Vision" 
                                                : "Upload an image first"}
                                        </button>
                                      ) : (
                                        <button 
                                          type="button" 
                                          className={s.btnPrimary} 
                                          style={{ width: "100%", padding: "10px", fontSize: "13px" }}
                                          onClick={() => handleSubmitVerification(task.id)}
                                        >
                                          {task.verification_type === "github" ? "Acknowledge" : "Submit"}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            <button type="button" onClick={handleAddTask} className={s.addTaskBtn}>
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                              Add manual task
                            </button>
                            
                            <button 
                              type="button" 
                              onClick={handleSaveTasks} 
                              className={s.btnPrimary}
                              style={{ width: "100%", marginTop: "16px", padding: "14px", justifyContent: "center" }}
                              disabled={isSavingTasks}
                            >
                              {isSavingTasks ? "Saving..." : `Save Week ${activeWeek} Tasks to DB`}
                            </button>
                          </div>
                        </div>
                      )
                    )}

                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
