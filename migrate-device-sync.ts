import mysql from "mysql2/promise";

async function main() {
  const pool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "yesboss",
  });

  try {
    await pool.query("ALTER TABLE accounts ADD COLUMN device_synced BOOLEAN DEFAULT 0;");
    console.log("Column 'device_synced' added.");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Column 'device_synced' already exists.");
    } else {
      console.error(err);
    }
  }

  try {
    await pool.query("ALTER TABLE accounts ADD COLUMN device_token VARCHAR(255);");
    console.log("Column 'device_token' added.");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Column 'device_token' already exists.");
    } else {
      console.error(err);
    }
  }

  process.exit();
}
main();
