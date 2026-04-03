const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });

  const [tasks] = await connection.execute('SELECT * FROM tasks LIMIT 20');
  const [projects] = await connection.execute('SELECT * FROM projects LIMIT 10');

  fs.writeFileSync('db-tasks.json', JSON.stringify({ tasks, projects }, null, 2));
  console.log('Written to db-tasks.json');
  await connection.end();
}

main().catch(console.error);
