import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { token, accountId } = await req.json();

    if (!token || !accountId) {
      return NextResponse.json({ message: "Token and account ID are required." }, { status: 400 });
    }

    // Verify token with github API
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "YesBoss-App"
      }
    });

    if (!userRes.ok) {
        return NextResponse.json({ message: "Invalid personal access token." }, { status: 401 });
    }
    const ghUser = await userRes.json();
    const ghUsername = ghUser.login;

    // Save token to database
    // Create column if they don't exist
    try { await pool.query("ALTER TABLE accounts ADD COLUMN github_token TEXT"); } catch (e) {}
    try { await pool.query("ALTER TABLE accounts ADD COLUMN github_username VARCHAR(255)"); } catch (e) {}

    await pool.query(
      "UPDATE accounts SET github_token = ?, github_username = ? WHERE id = ?",
      [token, ghUsername, accountId]
    );

    return NextResponse.json({ message: "Token connected successfully", username: ghUsername }, { status: 200 });
  } catch (error: any) {
    console.error("GitHub PAT Error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
