/**
 * Script/Source Inspector API
 * 
 * GET /api/inspect?type=script&name=hbx-sync-zoom-calls.py
 * GET /api/inspect?type=api&name=/api/sync/webforms
 * GET /api/inspect?type=mcp&name=capture_lead
 * 
 * Returns the source code for inspection in the UI.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const MCP_URL = process.env.PV2_MCP_URL || "https://pv2-mcp.vercel.app";
const MCP_KEY = process.env.PV2_MCP_API_KEY || "pv2-mcp-secret-key-change-me";
const GH_TOKEN = process.env.GITHUB_TOKEN || "";

async function fetchGitHubFile(repo: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${GH_TOKEN}`, Accept: "application/vnd.github.v3.raw" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const name = searchParams.get("name");

  if (!type || !name) {
    return NextResponse.json({ error: "type and name required" }, { status: 400 });
  }

  try {
    if (type === "script") {
      // Fetch Python script from GitHub
      const content = await fetchGitHubFile("Schellbrothers/pulse-v2", `scripts/${name}`);
      // Try HBx scripts location if not found
      const finalContent = content || await fetchGitHubFile("Schellbrothers/pulse-v2", name);
      if (!finalContent) {
        return NextResponse.json({ error: `Script not found: ${name}` }, { status: 404 });
      }
      return NextResponse.json({
        name, type: "python", language: "python",
        path: `HBx/scripts/${name}`,
        lines: finalContent.split("\n").length,
        content: finalContent,
      });
    }

    if (type === "api") {
      // Fetch API route source from GitHub
      const routePath = name.replace(/^\/api\//, "");
      const content = await fetchGitHubFile("Schellbrothers/pulse-v2", `apps/web/src/app/api/${routePath}/route.ts`);
      if (!content) {
        return NextResponse.json({ error: `API route not found: ${name}` }, { status: 404 });
      }
      return NextResponse.json({
        name, type: "api", language: "typescript",
        path: `apps/web/src/app/api/${routePath}/route.ts`,
        lines: content.split("\n").length,
        content,
      });
    }

    if (type === "mcp") {
      try {
        const res = await fetch(`${MCP_URL}/tools`, {
          headers: { Authorization: `Bearer ${MCP_KEY}` },
        });
        if (!res.ok) throw new Error(`MCP server returned ${res.status}`);
        const data = await res.json();
        const tools = data.tools || data.result || data;
        const tool = Array.isArray(tools) ? tools.find((t: Record<string, unknown>) => t.name === name) : null;
        return NextResponse.json({
          name, type: "mcp", language: "json",
          content: JSON.stringify(tool || tools, null, 2),
          description: tool?.description,
        });
      } catch (e) {
        return NextResponse.json({
          name, type: "mcp", language: "text",
          content: `MCP server unavailable: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
