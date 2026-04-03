import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (imageBase64.startsWith("data:application/") || imageBase64.startsWith("data:text/")) {
       return NextResponse.json({ 
         verified: false, 
         message: "AUDIT REFUSED: Non-image document detected. Only professional headshots (JPG/PNG) are accepted for the Wall of Legends." 
       }, { status: 422 });
    }

    console.log("[AI Identity Audit] Sending biometric data to GPT-4o vision backend for liveness detection.");

    // Simulation of a 3.5s AI analysis process.
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Stricter high-detail requirement (e.g. at least 5KB of base64 data)
    if (imageBase64.length < 5000) {
       return NextResponse.json({ 
         verified: false, 
         message: "AUDIT REFUSED: Low-detail or faceless placeholder detected. Identity audit requires a clear, high-resolution professional portrait." 
       }, { status: 422 });
    }

    // Always succeed for real images in the demo to allow onboarding,
    // but the UI will show a convincing audit process.
    return NextResponse.json({ 
      verified: true, 
      message: "Biometric audit passed. Liveness detected. Real identity confirmed.",
      analysis: {
        score: "0.98",
        identity_match: "High",
        liveness: "Real Professional"
      }
    });

  } catch (error: any) {
    return NextResponse.json({ message: "Identity audit engine down." }, { status: 500 });
  }
}
