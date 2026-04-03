import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export async function POST(req: Request) {
  try {
    const { goal, projectContext, weekNumber } = await req.json();

    // The user explicitly stated they saved their key as "open_ai"
    const apiKey = process.env.open_ai || process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ message: "Missing OpenAI API Key in completely. Set 'open_ai' or 'OPENAI_API_KEY' in your .env.local" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are YesBoss, an elite technical project manager and software engineering copilot.
Your job is to break down a high-level weekly goal into simple, actionable technical tasks.
Output ONLY a RAW JSON array of objects. Do not wrap in markdown \`\`\` or any text formatting. Just raw JSON brackets.
Format schema required: [{"text": "Build authentication login flow UI", "complexity_points": 5}, {"text": "Connect MySQL database driver", "complexity_points": 3}]
Assign a complexity_points value to each task between 1 and 10 based on estimated technical complexity.
Create realistically bite-sized developer tasks based entirely on the user's input. Max 6 tasks per request.`;

    const userPrompt = `Project Context Name: ${projectContext.name}
Project Description: ${projectContext.description || "N/A"}
Tech Stack: ${projectContext.techStack || "N/A"}
---
Target Week: Week ${weekNumber}
The Goal: ${goal}
---
Generate the technical checklist to achieve this goal gracefully.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    });

    const outputText = response.choices[0]?.message?.content?.trim() || "[]";
    
    // Safety check just in case GPT injects markdown block wrappers despite our prompt
    let cleanJsonString = outputText;
    if (cleanJsonString.startsWith("```json")) {
      cleanJsonString = cleanJsonString.replace("```json", "");
    }
    if (cleanJsonString.startsWith("```")) {
      cleanJsonString = cleanJsonString.replace("```", "");
    }
    if (cleanJsonString.endsWith("```")) {
      cleanJsonString = cleanJsonString.slice(0, -3);
    }
    cleanJsonString = cleanJsonString.trim();

    const generatedTasks = JSON.parse(cleanJsonString);

    return NextResponse.json({ tasks: generatedTasks }, { status: 200 });

  } catch (error: any) {
    console.error("OpenAI Generate Tasks Fetch Error:", error);
    return NextResponse.json(
      { message: "Failed to generate tasks using AI", error: error.message },
      { status: 500 }
    );
  }
}
