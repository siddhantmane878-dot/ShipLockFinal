import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    // Find the user by email in the accounts table
    const [rows]: any = await pool.query(
      "SELECT id, password, full_name, picture, device_synced, streak, endorsements FROM accounts WHERE email = ?",
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = rows[0];

    // Compare the hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Success - In a real app we would set a JWT cookie here
    return NextResponse.json(
      { 
        message: "Login successful", 
        user: {
          id: user.id,
          name: user.full_name,
          email: email,
          picture: user.picture,
          device_synced: Boolean(user.device_synced),
          streak: user.streak,
          endorsements: user.endorsements
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error. Ensure XAMPP MySQL is running." },
      { status: 500 }
    );
  }
}
