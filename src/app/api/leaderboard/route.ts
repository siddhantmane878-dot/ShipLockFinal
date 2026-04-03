import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // This query fetches the top 10 users by points (XP)
    // It also tries to find their "Core Project" (lexicographically first or latest)
    const [rows]: any = await pool.query(`
      SELECT 
        a.id, 
        a.full_name as name, 
        a.points as xp, 
        a.streak, 
        a.endorsements,
        (SELECT name FROM projects WHERE account_id = a.id ORDER BY created_at DESC LIMIT 1) as core_project
      FROM accounts a
      ORDER BY points DESC
      LIMIT 10
    `);

    return NextResponse.json({ professionals: rows }, { status: 200 });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ message: "Failed to fetch leaderboard", error: error.message }, { status: 500 });
  }
}
