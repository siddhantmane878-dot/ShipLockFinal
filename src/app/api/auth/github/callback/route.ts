import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=github_no_code', req.url));
  }

  try {
    let projectId = '';
    let accountId = '';
    if (state) {
      const parsed = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
      projectId = parsed.projectId;
      accountId = parsed.accountId;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GitHub app credentials not configured in .env.local.");
    }

    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      })
    });
    
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": "YesBoss-App"
      }
    });
    const ghUser = await userRes.json();
    const ghUsername = ghUser.login;

    if (accountId) {
      // Create column if they don't exist
      try { await pool.query("ALTER TABLE accounts ADD COLUMN github_token TEXT"); } catch (e) {}
      try { await pool.query("ALTER TABLE accounts ADD COLUMN github_username VARCHAR(255)"); } catch (e) {}

      await pool.query(
        "UPDATE accounts SET github_token = ?, github_username = ? WHERE id = ?",
        [accessToken, ghUsername, accountId]
      );
    }
    
    return NextResponse.redirect(new URL(`/dashboard?github_connected=true&project=${projectId}`, req.url));
  } catch (error: any) {
    console.error("GitHub Auth Error:", error);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
