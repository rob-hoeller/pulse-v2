export const revalidate = 60;

interface ActivityItem {
  type: string;
  icon: string;
  color: string;
  label: string;
  detail: string;
  time: string;
  tag: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface VercelDeployment {
  uid: string;
  url: string;
  name: string;
  state: string;
  createdAt: number;
}

interface VercelDeploymentsResponse {
  deployments: VercelDeployment[];
}

export async function GET() {
  const results: ActivityItem[] = [];

  // Fetch GitHub commits
  try {
    const ghRes = await fetch(
      "https://api.github.com/repos/rob-hoeller/pulse-v2/commits?per_page=15",
      {
        headers: {
          Authorization: "Bearer ${process.env.GITHUB_PAT}",
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (ghRes.ok) {
      const commits = (await ghRes.json()) as GitHubCommit[];
      for (const commit of commits) {
        const firstLine = commit.commit.message.split("\n")[0];
        const label =
          firstLine.length > 72 ? firstLine.slice(0, 72) : firstLine;
        results.push({
          type: "commit",
          icon: "⊞",
          color: "#0070f3",
          label,
          detail: `${commit.commit.author.name} · ${commit.sha.slice(0, 7)}`,
          time: commit.commit.author.date,
          tag: "GitHub",
        });
      }
    }
  } catch {
    // GitHub fetch failed — continue with whatever we have
  }

  // Fetch Vercel deployments
  try {
    const vercelRes = await fetch(
      "https://api.vercel.com/v6/deployments?limit=10",
      {
        headers: {
          Authorization:
            "Bearer ${process.env.VERCEL_TOKEN}",
        },
      }
    );

    if (vercelRes.ok) {
      const data = (await vercelRes.json()) as VercelDeploymentsResponse;
      const deployments = data.deployments ?? [];
      for (const deployment of deployments) {
        if (deployment.state !== "READY") continue;
        results.push({
          type: "deploy",
          icon: "✓",
          color: "#00c853",
          label: `Deployed: ${deployment.url}`,
          detail: `${deployment.name} · ${deployment.state}`,
          time: new Date(deployment.createdAt).toISOString(),
          tag: "Vercel",
        });
      }
    }
  } catch {
    // Vercel fetch failed — continue with whatever we have
  }

  // Merge + sort by time descending, cap at 15
  const activity = results
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 15);

  return Response.json({ activity });
}
