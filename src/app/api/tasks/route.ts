import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Fetch tasks for a specific project
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");

    if (!project_id) {
      return NextResponse.json({ message: "project_id is required" }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC",
      [project_id]
    );

    return NextResponse.json({ tasks: rows }, { status: 200 });
  } catch (error: any) {
    console.error("GET tasks error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// Bulk Sync/Save tasks for a specific project and week
export async function POST(req: Request) {
  try {
    const { project_id, week_number, tasks } = await req.json();

    if (!project_id || week_number === undefined) {
      return NextResponse.json(
        { message: "project_id and week_number are required." },
        { status: 400 }
      );
    }

    // Fetch existing tasks to detect newly completed ones
    const [existingTasks]: any = await pool.query(
      "SELECT id, text, is_completed, complexity_points FROM tasks WHERE project_id = ? AND week_number = ?",
      [project_id, week_number]
    );

    // Get account_id to award points
    const [projRows]: any = await pool.query("SELECT account_id FROM projects WHERE id = ?", [project_id]);
    const account_id = projRows[0]?.account_id;

    // 1. Delete existing tasks for this specific project AND week
    await pool.query(
      "DELETE FROM tasks WHERE project_id = ? AND week_number = ?",
      [project_id, week_number]
    );

    // 2. Insert the fresh batch of updated tasks (if there's any)
    if (tasks && tasks.length > 0) {
      // Find tasks without complexity_points
      const tasksWithoutPoints = tasks.filter((t: any) => !t.complexity_points);
      
      if (tasksWithoutPoints.length > 0) {
        const apiKey = process.env.open_ai || process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
        if (apiKey) {
          const { OpenAI } = require("openai");
          const openai = new OpenAI({ apiKey });
          
          const systemPrompt = `You are an AI that assigns complexity points (1-10) to technical tasks.
Output ONLY a RAW JSON object mapping task text to an integer score.
Example: {"Build login UI": 5, "Setup DB": 3}`;

          const userPrompt = `Assign complexity points to the following tasks:\n${tasksWithoutPoints.map((t: any) => "- " + t.text).join('\n')}`;
          
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.3,
            });
            
            const content = response.choices[0]?.message?.content?.trim() || "{}";
            
            let cleanJsonString = content;
            if (cleanJsonString.startsWith("```json")) cleanJsonString = cleanJsonString.replace("```json", "");
            if (cleanJsonString.startsWith("```")) cleanJsonString = cleanJsonString.replace("```", "");
            if (cleanJsonString.endsWith("```")) cleanJsonString = cleanJsonString.slice(0, -3);
            cleanJsonString = cleanJsonString.trim();
            
            const scoredTasks = JSON.parse(cleanJsonString);
            
            for (const t of tasks) {
              if (!t.complexity_points && scoredTasks[t.text]) {
                t.complexity_points = scoredTasks[t.text];
              }
            }
          } catch (aiError) {
            console.error("AI grading failed:", aiError);
          }
        }
      }

      let newlyCompletedPoints = 0;

      const values = tasks.map((t: any) => {
        const finalPoints = t.complexity_points || 1;
        
        // Check if task is newly completed manually via UI
        if (t.is_completed) {
          const existing = existingTasks.find((et: any) => et.text === t.text);
          // If it didn't exist or wasn't completed before, award points
          if (!existing || (!existing.is_completed && existing.is_completed !== 1)) {
            newlyCompletedPoints += finalPoints;
          }
        }

        return [
          project_id, 
          week_number, 
          t.text || "", 
          t.is_completed || false,
          t.verification_type || null,
          t.verification_url || null,
          finalPoints
        ];
      });

      await pool.query(
        "INSERT INTO tasks (project_id, week_number, text, is_completed, verification_type, verification_url, complexity_points) VALUES ?",
        [values]
      );

      // Award Points to User
      if (account_id && newlyCompletedPoints > 0) {
        await pool.query("UPDATE accounts SET points = COALESCE(points, 0) + ? WHERE id = ?", [newlyCompletedPoints, account_id]);
      }
    }

    return NextResponse.json(
      { message: "Tasks synced successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST tasks error:", error);
    return NextResponse.json(
      { message: "Failed to sync tasks", error: error.message },
      { status: 500 }
    );
  }
}
