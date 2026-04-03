const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });
  const [rows] = await connection.execute('SELECT github_username, github_token FROM accounts WHERE id = 1');
  await connection.end();
  const { github_username, github_token } = rows[0];

  console.log('Username:', github_username);

  // Test 1: Search API (what the route currently uses)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split("T")[0];
  const searchUrl = `https://api.github.com/search/commits?q=author:${github_username}+author-date:>=${dateStr}&sort=author-date&order=desc&per_page=5`;
  console.log('\n--- Test 1: Search API ---');
  console.log('URL:', searchUrl);

  const searchRes = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${github_token}`,
      'User-Agent': 'YesBoss-App',
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  console.log('Status:', searchRes.status);
  const searchData = await searchRes.json();
  console.log('Total count:', searchData.total_count);
  console.log('Items:', (searchData.items || []).length);
  if (searchData.message) console.log('Error message:', searchData.message);
  console.log('Full response keys:', Object.keys(searchData));

  // Test 2: Events API
  console.log('\n--- Test 2: Events API ---');
  const eventsRes = await fetch(`https://api.github.com/users/${github_username}/events/public`, {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App' }
  });
  const events = await eventsRes.json();
  const pushEvents = Array.isArray(events) ? events.filter(e => e.type === 'PushEvent') : [];
  console.log('Push events found:', pushEvents.length);
  
  const allCommits = [];
  for (const push of pushEvents) {
    console.log('  Repo:', push.repo.name);
    const commits = push.payload?.commits || [];
    for (const c of commits) {
      console.log('    Commit:', c.sha?.substring(0, 7), c.message?.substring(0, 50));
      allCommits.push({ repo: push.repo.name, sha: c.sha });
    }
  }

  // Test 3: Fetch actual commit diff from the events-based commits
  if (allCommits.length > 0) {
    console.log('\n--- Test 3: Fetching Commit Diff ---');
    const c = allCommits[0];
    console.log(`Fetching: ${c.repo}/commits/${c.sha}`);
    const commitRes = await fetch(`https://api.github.com/repos/${c.repo}/commits/${c.sha}`, {
      headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App', 'Accept': 'application/vnd.github.v3+json' }
    });
    console.log('Status:', commitRes.status);
    const commitData = await commitRes.json();
    console.log('Message:', commitData.commit?.message);
    console.log('Files count:', commitData.files?.length);
    if (commitData.files) {
      for (const f of commitData.files.slice(0, 3)) {
        console.log(`  File: ${f.filename}, has patch: ${!!f.patch}, patch length: ${f.patch?.length || 0}`);
      }
    }
    if (commitData.message) console.log('Error:', commitData.message);
  }
}

main().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); });
