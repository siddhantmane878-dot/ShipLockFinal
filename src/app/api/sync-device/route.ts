import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { account_id, device_token } = await req.json();

    if (!account_id || !device_token) {
      return NextResponse.json(
        { message: "account_id and device_token are required." },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE accounts SET device_synced = 1, device_token = ? WHERE id = ?",
      [device_token, account_id]
    );

    return NextResponse.json(
      { message: "Device synced successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Sync device error:", error);
    return NextResponse.json(
      { message: "Failed to sync device", error: error.message },
      { status: 500 }
    );
  }
}
