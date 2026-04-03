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
    await pool.query("ALTER TABLE tasks ADD COLUMN complexity_points INT DEFAULT NULL;");
    console.log("Column added");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Column already exists");
    } else {
      console.error(err);
    }
  }
  process.exit();
}
main();
