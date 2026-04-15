import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { toolName, params } = await req.json();
  const MCP_URL = process.env.PV2_MCP_URL ?? "https://pv2-mcp.vercel.app";
  const MCP_KEY = process.env.PV2_MCP_API_KEY ?? "pv2-mcp-secret-key-change-me";

  const r = await fetch(`${MCP_URL}/tools/${toolName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MCP_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const data = await r.json();
  return NextResponse.json(data);
}
