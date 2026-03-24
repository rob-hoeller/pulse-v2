import { NextRequest, NextResponse } from "next/server";

// Notifies Schellie (via OpenClaw Telegram) when a new task is created
// Schellie receives the message and automatically kicks off the planning workflow

export async function POST(req: NextRequest) {
  try {
    const { task_id, task_name, task_type, description } = await req.json();

    const typeLabel = task_type === "bugfix" ? "⚡ Bugfix" : "◈ Feature";
    const message = [
      `📋 *New Task Created*`,
      ``,
      `*${task_name}*`,
      `${typeLabel}${description ? `\n\n${description}` : ""}`,
      ``,
      `Task ID: \`${task_id}\``,
      ``,
      `Starting planning workflow...`,
    ].join("\n");

    // Send via OpenClaw gateway to Schellie's Telegram session
    const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:9922";
    const LANCE_CHAT_ID = "telegram:8391685290";

    await fetch(`${OPENCLAW_GATEWAY}/api/sessions/${LANCE_CHAT_ID}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `NEW_TASK_CREATED\ntask_id=${task_id}\ntask_name=${task_name}\ntask_type=${task_type}\ndescription=${description || ""}`,
      }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      // Gateway not reachable — log but don't fail the response
      console.log(`[notify] Task ${task_id} created — gateway notification failed (offline?)`);
    });

    return NextResponse.json({ ok: true, task_id });
  } catch (e) {
    console.error("Notify error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
