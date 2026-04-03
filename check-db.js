const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'yesboss'
  });

  const [rows] = await connection.execute('SELECT * FROM accounts');
  const data = rows.map(r => ({id: r.id, g_user: r.github_username, g_token: r.github_token?.substring(0, 10) }));
  
  fs.writeFileSync('db-info.json', JSON.stringify(data, null, 2));
  await connection.end();
}

main().catch(console.error);
