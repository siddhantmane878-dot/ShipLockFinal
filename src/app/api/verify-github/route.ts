import { NextResponse } from "next/server";
import pool from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.open_ai,
});

export async function POST(req: Request) {
  try {
    const { project_id, week_number, account_id } = await req.json();

    if (!project_id || !week_number || !account_id) {
      return NextResponse.json({ message: "project_id, week_number, and account_id are required." }, { status: 400 });
    }

    // 1. Get user's GitHub Token & Username
    const [userRows]: any = await pool.query(
      "SELECT github_token, github_username FROM accounts WHERE id = ?",
      [account_id]
    );

    if (userRows.length === 0 || !userRows[0].github_token) {
      return NextResponse.json({ message: "GitHub is not connected for this account." }, { status: 400 });
    }

    const { github_token, github_username } = userRows[0];

    // 2. Fetch tasks for this project and week
    const [tasksRows]: any = await pool.query(
      "SELECT id, text, is_completed FROM tasks WHERE project_id = ? AND week_number = ?",
      [project_id, week_number]
    );

    if (tasksRows.length === 0) {
      return NextResponse.json({ message: "No tasks found for this week." }, { status: 400 });
    }

    const pendingTasks = tasksRows.filter((t: any) => !t.is_completed);
    if (pendingTasks.length === 0) {
      return NextResponse.json({ message: "All tasks for this week are already completed!" }, { status: 200 });
    }

    // 3. Use GitHub Events API to find recent commits by this user
    console.log("[verify-github] Step 3: Fetching events for", github_username);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const eventsRes = await fetch(
      `https://api.github.com/users/${github_username}/events?per_page=30`,
      {
        headers: {
          "Authorization": `Bearer ${github_token}`,
          "User-Agent": "YesBoss-App",
          "Accept": "application/vnd.github.v3+json"
        }
      }
    );

    if (!eventsRes.ok) {
      const errData = await eventsRes.json();
      throw new Error(`GitHub events fetch failed: ${errData.message}`);
    }

    const events = await eventsRes.json();
    if (!Array.isArray(events)) {
      throw new Error("GitHub events response is not an array");
    }

    // Filter to PushEvents within the last 7 days to find active repositories
    const activeRepos = new Set<string>();
    for (const event of events) {
      if (event.type === "PushEvent" && new Date(event.created_at) >= sevenDaysAgo) {
        if (event.repo?.name) activeRepos.add(event.repo.name);
      }
    }

    if (activeRepos.size === 0) {
      return NextResponse.json({ message: "No recent commits found on GitHub in the last 7 days." }, { status: 200 });
    }

    // Fetch the actual commits directly from those active repositories
    const recentCommits: { repo: string, sha: string }[] = [];
    for (const repo of Array.from(activeRepos).slice(0, 3)) { // Up to 3 active repos
      try {
        const repoCommitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=10`, {
          headers: {
            "Authorization": `Bearer ${github_token}`,
            "User-Agent": "YesBoss-App",
            "Accept": "application/vnd.github.v3+json"
          }
        });
        if (repoCommitsRes.ok) {
          const repoCommits = await repoCommitsRes.json();
          if (Array.isArray(repoCommits)) {
            for (const commit of repoCommits) {
              if (new Date(commit.commit.author.date) >= sevenDaysAgo) {
                recentCommits.push({ repo, sha: commit.sha });
              }
            }
          }
        }
      } catch (e: any) {
        console.error(`[verify-github] Failed to fetch commits for repo ${repo}:`, e.message);
      }
    }

    console.log("[verify-github] Recent commits found directly from repos:", recentCommits.length);

    if (recentCommits.length === 0) {
      return NextResponse.json({ message: "No recent commits found on GitHub in the last 7 days." }, { status: 200 });
    }

    // Fetch diffs/patches for up to 10 recent commits
    let diffSummary = "";
    for (const commitInfo of recentCommits.slice(0, 10)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const commitRes = await fetch(`https://api.github.com/repos/${commitInfo.repo}/commits/${commitInfo.sha}`, {
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${github_token}`,
            "User-Agent": "YesBoss-App",
            "Accept": "application/vnd.github.v3+json"
          }
        });
        clearTimeout(timeout);
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          diffSummary += `\n\n--- Commit: ${commitData.commit?.message || 'unknown'} ---\n`;
          const files = (commitData.files || []).slice(0, 10);
          for (const file of files) {
            if (file.patch) {
              const patch = file.patch.substring(0, 1000);
              diffSummary += `File: ${file.filename}\nPatch:\n${patch}\n`;
            }
          }
        }
      } catch (err: any) {
        console.error("[verify-github] Commit fetch error:", err.message);
      }
    }

    console.log("[verify-github] Diff summary length:", diffSummary.length);
    if (!diffSummary) {
      return NextResponse.json({ message: "Found commits, but could not extract code diffs to verify." }, { status: 200 });
    }

    // 4. Use OpenAI to analyze diffs
    const prompt = `
You are a senior engineer verifying work. Below are the pending tasks for this week and a summary of recent code commits (diffs) made by the developer.

PENDING TASKS:
${pendingTasks.map((t: any) => `[ID: ${t.id}] ${t.text}`).join('\n')}

RECENT CODE DIFFS:
${diffSummary}

Based on the actual code diffs, determine which tasks are fully completed. You must respond ONLY with a JSON array of the task IDs that are genuinely completed in reality. Do not include tasks that are only partially done or not reflected in the code.
Provide ONLY the JSON array. Example: [1, 5, 8]. If none are completed, return [].
`;

    console.log("[verify-github] Step 4: Calling OpenAI...");
    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for speed and efficiency
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });
    console.log("[verify-github] OpenAI responded:", aiRes.choices[0].message.content?.substring(0, 100));

    let completedTaskIds: number[] = [];
    try {
      const responseText = aiRes.choices[0].message.content?.trim() || "[]";
      // Strip out markdown if OpenAI adds it
      const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "");
      completedTaskIds = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse OpenAI response: ", aiRes.choices[0].message.content);
    }

    if (!Array.isArray(completedTaskIds) || completedTaskIds.length === 0) {
      return NextResponse.json({ message: "AI verified the code but did not find sufficient evidence that any tasks were completed." }, { status: 200 });
    }

    // 5. Update completed tasks in DB
    const validIds = completedTaskIds.filter(id => !isNaN(Number(id)));
    if (validIds.length > 0) {
      const idList = validIds.join(",");
      
      // Get the tasks that are not yet officially completed to properly sum points
      const [tasksToAward]: any = await pool.query(
        `SELECT id, complexity_points FROM tasks WHERE id IN (${idList}) AND project_id = ? AND (is_completed = 0 OR is_completed IS NULL)`,
        [project_id]
      );

      await pool.query(`UPDATE tasks SET is_completed = true, verification_type = 'github_ai_agent' WHERE id IN (${idList}) AND project_id = ?`, [project_id]);

      // Award Points
      if (tasksToAward.length > 0) {
        const totalPoints = tasksToAward.reduce((sum: number, t: any) => sum + (t.complexity_points || 1), 0);
        await pool.query("UPDATE accounts SET points = COALESCE(points, 0) + ? WHERE id = ?", [totalPoints, account_id]);
      }

      return NextResponse.json({ message: `Success! AI verified and marked ${validIds.length} task(s) as completed based on your code diffs!` }, { status: 200 });
    } else {
      return NextResponse.json({ message: "No pending tasks matched the AI verification." }, { status: 200 });
    }

  } catch (error: any) {
    console.error("Verify GitHub Error:", error?.message, error?.stack?.split('\n').slice(0,3).join(' | '));
    return NextResponse.json({ message: "Server error during GitHub verification", error: error.message }, { status: 500 });
  }
}
