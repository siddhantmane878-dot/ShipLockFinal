import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.open_ai,
});

export async function POST(req: Request) {
  try {
    const { name, description, tech_stack, deadline, userName } = await req.json();

    const prompt = `You are a demanding, high-standards, yet visionary tech executive known as "YesBoss". 
The developer '${userName || 'you'}' has just been assigned their newest project:
- Project Name: ${name}
- Description: ${description || 'Not provided'}
- Tech Stack: ${tech_stack || 'Not specified'}
- Deadline: ${deadline || 'ASAP'}

Give a short, punchy, cinematic (3-4 sentences max) introduction to this developer as their new boss.
Welcome them to the fold, outline the stakes and significance of this specific project, and make it crystal clear that failure is not an option before the impending deadline. 
It should feel authoritative, slightly intimidating, but incredibly motivational—like a scene from a high-stakes tech thriller. 
Do not use quotes. Start immediately with what you have to say.`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const message = aiRes.choices[0].message.content?.trim() || "Let's get to work. I expect nothing less than perfection.";
    
    return NextResponse.json({ message }, { status: 200 });
  } catch (error: any) {
    console.error("Boss Intro Error:", error);
    return NextResponse.json({ message: "Welcome to the team. I expect perfect results." }, { status: 500 });
  }
}
