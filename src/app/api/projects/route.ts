import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Fetch projects for a user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const account_id = searchParams.get("account_id");

    if (!account_id) {
      return NextResponse.json({ message: "account_id is required" }, { status: 400 });
    }

    // 1. Fetch Projects
    const [projects]: any = await pool.query(
      "SELECT * FROM projects WHERE account_id = ? ORDER BY created_at DESC", 
      [account_id]
    );

    // 2. Fetch all Tasks belonging to this user's projects
    const [tasks]: any = await pool.query(
      "SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE account_id = ?)", 
      [account_id]
    );

    // 3. Process weighted visual progress
    const processedProjects = projects.map((p: any) => {
      const pTasks = tasks.filter((t: any) => t.project_id === p.id);
      
      // Calculate active total weeks for the project (same logic as dashboard)
      const start = p.created_at ? new Date(p.created_at) : new Date();
      const originalDeadline = p.deadline ? new Date(p.deadline) : new Date(start.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const effectiveEndTime = now > originalDeadline ? now : originalDeadline;
      
      const diffTime = effectiveEndTime.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let totalWeeks = Math.ceil(diffDays / 7);
      if (totalWeeks <= 0) totalWeeks = 1;
      if (totalWeeks > 52) totalWeeks = 52; // 1 year cap

      // Group by week
      const weeksData: Record<number, { total: number, completed: number }> = {};
      pTasks.forEach((t: any) => {
        if (!weeksData[t.week_number]) weeksData[t.week_number] = { total: 0, completed: 0 };
        weeksData[t.week_number].total += 1;
        if (t.is_completed) weeksData[t.week_number].completed += 1;
      });

      // Sum prorated progress
      let actualProgress = 0;
      Object.values(weeksData).forEach(w => {
        if (w.total > 0) {
          const ratio = w.completed / w.total;
          actualProgress += ratio * (100 / totalWeeks);
        }
      });

      return {
        ...p,
        calculatedProgress: Math.min(100, Math.round(actualProgress))
      };
    });

    return NextResponse.json({ projects: processedProjects }, { status: 200 });
  } catch (error: any) {
    console.error("GET projects error:", error);
    return NextResponse.json(
      { message: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// Create a new project
export async function POST(req: Request) {
  try {
    const { account_id, name, description, tech_stack, deadline } = await req.json();

    if (!account_id || !name) {
      return NextResponse.json(
        { message: "account_id and name are required." },
        { status: 400 }
      );
    }

    // Insert new project
    const [result]: any = await pool.query(
      "INSERT INTO projects (account_id, name, description, tech_stack, deadline) VALUES (?, ?, ?, ?, ?)",
      [
        account_id, 
        name, 
        description || "", 
        tech_stack || "", 
        deadline || null
      ]
    );

    return NextResponse.json(
      { 
        message: "Project created successfully", 
        projectId: result.insertId 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST project error:", error);
    return NextResponse.json(
      { message: "Failed to create project", error: error.message },
      { status: 500 }
    );
  }
}
