import { NextResponse } from "next/server";
import pool from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.open_ai,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const taskId = formData.get("task_id") as string;
    const taskText = formData.get("task_text") as string;
    const projectId = formData.get("project_id") as string;
    const imageFile = formData.get("image") as File | null;

    if (!taskId || !taskText || !projectId) {
      return NextResponse.json(
        { message: "task_id, task_text, and project_id are required." },
        { status: 400 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        { message: "No image file was uploaded." },
        { status: 400 }
      );
    }

    // Convert the uploaded file to a base64 data URL for GPT Vision
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = imageFile.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Build the GPT-4o Vision prompt
    const prompt = `You are a strict project manager AI verifying task completion via an uploaded image/screenshot.

TASK TO VERIFY:
"${taskText}"

The user has uploaded an image claiming to show that this task is complete. Analyze the image carefully and determine:

1. Does the image show relevant work that matches the task description?
2. Is there sufficient visual evidence that the task has been genuinely completed?
3. Is this a real screenshot/design and not a placeholder or irrelevant image?

You MUST respond with a JSON object in this exact format:
{
  "is_completed": true/false,
  "confidence": 0-100,
  "reason": "A brief explanation of why you believe the task is or isn't completed"
}

Be reasonably strict but fair. If the image clearly shows the described work (even partially matching), mark it as completed. If the image is completely irrelevant, blank, or clearly fake, mark it as NOT completed. Respond ONLY with the JSON object.`;

    console.log("[verify-design] Sending image to GPT-4o Vision for task:", taskText.substring(0, 60));

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "low", // Use low detail to save tokens while still getting good analysis
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const responseText = aiRes.choices[0].message.content?.trim() || "{}";
    console.log("[verify-design] GPT-4o Response:", responseText);

    // Parse the AI response
    let verification: { is_completed: boolean; confidence: number; reason: string };
    try {
      const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      verification = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[verify-design] Failed to parse AI response:", responseText);
      return NextResponse.json(
        {
          message: "AI returned an unparseable response. Please try again.",
          raw: responseText,
        },
        { status: 500 }
      );
    }

    // If the AI confirms completion, update the DB
    if (verification.is_completed) {
      // Fetch task complexity_points and account_id to award points correctly exactly once
      const [taskRows]: any = await pool.query(
        "SELECT t.complexity_points, t.is_completed, p.account_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND t.project_id = ?",
        [taskId, projectId]
      );

      await pool.query(
        "UPDATE tasks SET is_completed = true, verification_type = 'design_ai_verified' WHERE id = ? AND project_id = ?",
        [taskId, projectId]
      );

      // Award points if the task was not already completed
      if (taskRows.length > 0 && (!taskRows[0].is_completed && taskRows[0].is_completed !== 1)) {
        const pts = taskRows[0].complexity_points || 1;
        const accId = taskRows[0].account_id;
        if (accId) {
          await pool.query("UPDATE accounts SET points = COALESCE(points, 0) + ? WHERE id = ?", [pts, accId]);
        }
      }
    }

    return NextResponse.json(
      {
        is_completed: verification.is_completed,
        confidence: verification.confidence,
        reason: verification.reason,
        message: verification.is_completed
          ? `✅ Task verified! AI is ${verification.confidence}% confident this task is complete.`
          : `❌ Task not verified. ${verification.reason}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[verify-design] Error:", error?.message, error?.stack?.split("\n").slice(0, 3).join(" | "));
    return NextResponse.json(
      { message: "Server error during design verification", error: error.message },
      { status: 500 }
    );
  }
}
