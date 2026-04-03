const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });
  const [rows] = await connection.execute('SELECT github_username, github_token FROM accounts WHERE id = 1');
  await connection.end();

  const { github_username, github_token } = rows[0];

  // Check token identity
  const whoRes = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App' }
  });
  const whoData = await whoRes.json();

  // Check all events
  const evRes = await fetch(`https://api.github.com/users/${github_username}/events`, {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App' }
  });
  const events = await evRes.json();

  const result = {
    storedUsername: github_username,
    tokenBelongsTo: whoData.login,
    match: whoData.login === github_username,
    totalEvents: events.length,
    events: events.map(e => ({ type: e.type, created_at: e.created_at, repo: e.repo?.name }))
  };

  fs.writeFileSync('github-diag.json', JSON.stringify(result, null, 2));
  console.log('Done. Written to github-diag.json');
}

main().catch(console.error);
