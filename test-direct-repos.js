const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'yesboss'
  });
  const [rows] = await connection.execute('SELECT github_username, github_token FROM accounts WHERE id = 1');
  await connection.end();
  const { github_username, github_token } = rows[0];

  const eventsRes = await fetch(`https://api.github.com/users/${github_username}/events?per_page=30`, {
    headers: { 'Authorization': `Bearer ${github_token}`, 'User-Agent': 'YesBoss-App', 'Accept': 'application/vnd.github.v3+json' }
  });
  const events = await eventsRes.json();
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeRepos = new Set();
  for (const event of events) {
    if (event.type === "PushEvent" && new Date(event.created_at) >= sevenDaysAgo) {
      if (event.repo?.name) activeRepos.add(event.repo.name);
    }
  }

  console.log('Active Repos:', Array.from(activeRepos));

  const recentCommits = [];
  for (const repo of Array.from(activeRepos).slice(0, 3)) { // Up to 3 active repos
    try {
      console.log(`Fetching commits for repo ${repo}...`);
      const repoCommitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?author=${github_username}&per_page=10`, {
        headers: {
          "Authorization": `Bearer ${github_token}`,
          "User-Agent": "YesBoss-App",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (repoCommitsRes.ok) {
        const repoCommits = await repoCommitsRes.json();
        if (Array.isArray(repoCommits)) {
          for (const commit of repoCommits) {
            console.log("Analyzing commit:", commit.sha, commit.commit?.author?.date);
            if (new Date(commit.commit.author.date) >= sevenDaysAgo) {
              recentCommits.push({ repo, sha: commit.sha });
            }
          }
        }
      } else {
        console.error("Failed:", await repoCommitsRes.text());
      }
    } catch (e) {
      console.error(`Failed to fetch commits for repo ${repo}:`, e.message);
    }
  }

  console.log('Recent Commits directly from repos:', recentCommits.length);

}
main().catch(console.error);
