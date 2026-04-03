import { NextResponse } from "next/server";
import pool from "@/lib/db";

const DEFAULT_FAILURES = [
  "Spent 40 hours perfecting a font choice that nobody will ever see. Zero code shipped.",
  "Refactored a functional authentication module three times in one week for 'theoretical elegance'.",
  "Preferred documentation depth over feature completion. Sunday deadline missed.",
  "Failed to ship because of 'visualizing the data flow' instead of writing code.",
  "Kerning inconsistencies took priority over core business logic.",
  "Argued about semantic naming of CSS variables while the production server was down."
];

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ message: "User ID required" }, { status: 400 });
    }

    // Check all incomplete projects of this user that have passed their deadline
    const [expiredProjects]: any = await pool.query(`
      SELECT p.id, p.name, p.deadline, p.account_id 
      FROM projects p
      WHERE p.account_id = ? AND p.deadline < CURDATE()
    `, [userId]);

    for (const project of expiredProjects) {
      // Check if there are any incomplete tasks for this project
      const [incompleteTasks]: any = await pool.query(`
        SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND is_completed = 0
      `, [project.id]);

      if (incompleteTasks[0].count > 0) {
        // Check if this project failure is already on the Jokers wall
        const [existing]: any = await pool.query(`
          SELECT id FROM jokers WHERE account_id = ? AND project_name = ?
        `, [userId, project.name]);

        if (existing.length === 0) {
          // Add to Jokers wall
          const reason = DEFAULT_FAILURES[Math.floor(Math.random() * DEFAULT_FAILURES.length)];
          
          await pool.query(`
            INSERT INTO jokers (account_id, project_name, failure_reason)
            VALUES (?, ?, ?)
          `, [userId, project.name, reason]);

          // Also reset points/streak as a punishment
          await pool.query(`
            UPDATE accounts SET streak = 0, points = GREATEST(points - 500, 0) WHERE id = ?
          `, [userId]);
          
          return NextResponse.json({ 
            punished: true, 
            message: `Deadline missed for ${project.name}. You have been added to the Joker's Wall.`,
            reason: reason 
          });
        }
      }
    }

    return NextResponse.json({ punished: false });
  } catch (error: any) {
    console.error("Check jokers error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
