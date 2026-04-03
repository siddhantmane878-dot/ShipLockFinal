const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });
  const [rows] = await connection.execute('SELECT github_username, github_token FROM accounts WHERE id = 1');
  await connection.end();
  const { github_username, github_token } = rows[0];

  const eventsRes = await fetch(`https://api.github.com/users/${github_username}/events?per_page=5`, {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App' }
  });
  const events = await eventsRes.json();
  
  // Dump the FULL push event payload
  const pushEvent = events.find(e => e.type === 'PushEvent');
  if (pushEvent) {
    console.log('=== FULL PushEvent payload ===');
    console.log(JSON.stringify(pushEvent, null, 2));
  } else {
    console.log('No PushEvent found');
    console.log('Events:', JSON.stringify(events, null, 2));
  }
}

main().catch(e => console.error('FATAL:', e));
