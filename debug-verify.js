const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const pool = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });

  // Read env file
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });

  const project_id = 4, week_number = 1, account_id = 1;

  const [userRows] = await pool.execute('SELECT github_token, github_username FROM accounts WHERE id = ?', [account_id]);
  const { github_token, github_username } = userRows[0];
  console.log('1. User:', github_username);

  const [tasksRows] = await pool.execute('SELECT id, text, is_completed FROM tasks WHERE project_id = ? AND week_number = ?', [project_id, week_number]);
  console.log('2. Tasks:', tasksRows.length);

  console.log('3. Fetching GitHub events...');
  const eventsRes = await fetch(`https://api.github.com/users/${github_username}/events/public`, {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App', 'Accept': 'application/vnd.github.v3+json' }
  });
  console.log('   Events status:', eventsRes.status);
  const events = await eventsRes.json();
  console.log('   Events count:', Array.isArray(events) ? events.length : 'NOT ARRAY: ' + JSON.stringify(events).substring(0, 200));

  if (!Array.isArray(events)) { pool.end(); return; }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentPushes = events.filter(e => e.type === 'PushEvent' && new Date(e.created_at) >= sevenDaysAgo);
  console.log('4. Recent push events (7d):', recentPushes.length);

  if (recentPushes.length === 0) { pool.end(); return; }

  const commitsToFetch = [];
  for (const push of recentPushes.slice(0, 5)) {
    const repo = push.repo.name;
    for (const commit of push.payload.commits) {
      commitsToFetch.push({ repo, sha: commit.sha });
    }
  }
  console.log('5. Commits to fetch:', commitsToFetch.length);

  let diffSummary = '';
  for (const commitInfo of commitsToFetch.slice(0, 10)) {
    console.log(`   Fetching commit ${commitInfo.sha} from ${commitInfo.repo}...`);
    const commitRes = await fetch(`https://api.github.com/repos/${commitInfo.repo}/commits/${commitInfo.sha}`, {
      headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App', 'Accept': 'application/vnd.github.v3+json' }
    });
    console.log('   Commit fetch status:', commitRes.status);
    const commitData = await commitRes.json();
    console.log('   Commit msg:', commitData.commit?.message ?? 'NO MSG', 'Files:', commitData.files?.length ?? 'NONE', 'Error:', commitData.message ?? 'none');
    if (commitRes.ok && commitData.files) {
      diffSummary += `\n\n--- Commit: ${commitData.commit.message} ---\n`;
      for (const file of commitData.files) {
        if (file.patch) diffSummary += `File: ${file.filename}\nPatch:\n${file.patch.substring(0, 500)}\n`;
      }
    }
  }

  console.log('6. Diff summary length:', diffSummary.length);
  if (diffSummary.length > 0) {
    console.log('   Preview:', diffSummary.substring(0, 200));
    console.log('\n✅ GitHub data looks good! Problem is likely in OpenAI call or DB update.');
  } else {
    console.log('   ❌ No diff content extracted!');
  }

  await pool.end();
}

main().catch(e => {
  console.error('FATAL ERROR:', e.message);
  console.error(e.stack);
});
