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
    await pool.query("ALTER TABLE accounts ADD COLUMN points INT DEFAULT 0;");
    console.log("Column 'points' added to 'accounts'");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Column 'points' already exists in 'accounts'");
    } else {
      console.error(err);
    }
  }
  process.exit();
}
main();
