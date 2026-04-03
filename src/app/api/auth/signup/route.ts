import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password, full_name, picture, social_handle } = await req.json();

    if (!email || !password || !full_name || !picture || !social_handle) {
      return NextResponse.json(
        { message: "All fields including profile picture and social handle are compulsory." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [rows]: any = await pool.query(
      "SELECT id FROM accounts WHERE email = ?",
      [email]
    );

    if (rows && rows.length > 0) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user into the database
    const [result]: any = await pool.query(
      "INSERT INTO accounts (email, password, full_name, picture, social_handle) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, full_name, picture, social_handle || '']
    );

    return NextResponse.json(
      { message: "User established successfully!", userId: result.insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error. Ensure database connection is active.", error: error.message },
      { status: 500 }
    );
  }
}
