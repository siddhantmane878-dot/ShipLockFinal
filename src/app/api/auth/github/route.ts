import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId') || '';
  const accountId = url.searchParams.get('accountId') || '';
  
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent("GITHUB_CLIENT_ID is not configured in .env.local")}`, req.url));
  }

  const state = encodeURIComponent(Buffer.from(JSON.stringify({ projectId, accountId })).toString('base64'));
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/github/callback`);
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user&state=${state}`;
  
  console.log("GitHub Auth Redirecting to:", githubAuthUrl);
  return NextResponse.redirect(githubAuthUrl);
}
