const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });
  const [rows] = await connection.execute('SELECT github_username, github_token FROM accounts WHERE id = 1');
  await connection.end();
  const { github_username, github_token } = rows[0];

  console.log('Username:', github_username);
  console.log('Token prefix:', github_token?.substring(0, 15) + '...');
  console.log('Token length:', github_token?.length);

  // Step 1: Verify token is valid
  console.log('\n=== Step 1: Token validation ===');
  const whoRes = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App' }
  });
  const whoData = await whoRes.json();
  console.log('Token belongs to:', whoData.login);
  console.log('Token scopes from header:', whoRes.headers.get('x-oauth-scopes'));

  // Step 2: Events API (authenticated - includes private events)
  console.log('\n=== Step 2: Events API (authenticated) ===');
  const eventsUrl = `https://api.github.com/users/${github_username}/events?per_page=30`;
  console.log('URL:', eventsUrl);
  const eventsRes = await fetch(eventsUrl, {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App', 'Accept': 'application/vnd.github.v3+json' }
  });
  console.log('Status:', eventsRes.status);
  const events = await eventsRes.json();
  console.log('Is array:', Array.isArray(events));
  console.log('Total events:', Array.isArray(events) ? events.length : 'NOT ARRAY');
  
  if (!Array.isArray(events)) {
    console.log('Response:', JSON.stringify(events).substring(0, 500));
    return;
  }

  // Log ALL events
  console.log('\nAll events:');
  events.forEach((e, i) => {
    console.log(`  [${i}] type=${e.type}, created_at=${e.created_at}, repo=${e.repo?.name}`);
    if (e.type === 'PushEvent') {
      const commits = e.payload?.commits || [];
      commits.forEach(c => {
        console.log(`       commit: ${c.sha?.substring(0,7)} - ${c.message?.substring(0,60)}`);
      });
    }
  });

  // Step 3: Filter for recent pushes
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  console.log('\n=== Step 3: Filtering ===');
  console.log('Seven days ago:', sevenDaysAgo.toISOString());
  
  const recentCommits = [];
  for (const event of events) {
    const eventDate = new Date(event.created_at);
    const isRecent = eventDate >= sevenDaysAgo;
    if (event.type === 'PushEvent') {
      console.log(`PushEvent at ${event.created_at}, isRecent=${isRecent}, date comparison: ${eventDate.getTime()} >= ${sevenDaysAgo.getTime()}`);
      if (isRecent) {
        const repo = event.repo?.name;
        const commits = event.payload?.commits || [];
        for (const commit of commits) {
          if (commit.sha && repo) {
            recentCommits.push({ repo, sha: commit.sha });
          }
        }
      }
    }
  }

  console.log('\nRecent commits found:', recentCommits.length);
  recentCommits.forEach(c => console.log(`  ${c.repo} - ${c.sha.substring(0,7)}`));

  // Step 4: Try to fetch a diff
  if (recentCommits.length > 0) {
    console.log('\n=== Step 4: Fetching diff ===');
    const c = recentCommits[0];
    const diffRes = await fetch(`https://api.github.com/repos/${c.repo}/commits/${c.sha}`, {
      headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App', 'Accept': 'application/vnd.github.v3+json' }
    });
    console.log('Diff status:', diffRes.status);
    const diffData = await diffRes.json();
    console.log('Commit message:', diffData.commit?.message);
    console.log('Files:', diffData.files?.length);
    if (diffData.files) {
      diffData.files.slice(0, 3).forEach(f => {
        console.log(`  ${f.filename} - patch length: ${f.patch?.length || 0}`);
      });
    }
  }
}

main().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); });
