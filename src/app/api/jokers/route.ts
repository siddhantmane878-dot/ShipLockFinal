import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        j.id, 
        a.full_name as name, 
        a.picture,
        j.project_name as project,
        j.failure_reason as reason,
        j.created_at
      FROM jokers j
      JOIN accounts a ON j.account_id = a.id
      ORDER BY j.created_at DESC
      LIMIT 20
    `);

    return NextResponse.json({ jokers: rows }, { status: 200 });
  } catch (error: any) {
    console.error("Jokers wall error:", error);
    return NextResponse.json({ message: "Failed to fetch jokers", error: error.message }, { status: 500 });
  }
}
