"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveSession {
  id: string;
  session_key: string;
  status: string;
  page_url: string | null;
  geo_city: string | null;
  geo_region: string | null;
  messages: Array<{ role: string; content: string; ts: string; source?: string }>;
  message_count: number;
  lead_captured: boolean;
  is_human_controlled: boolean;
  human_agent_id: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  division_id: string | null;
  community_id: string | null;
  started_at: string;
  last_message_at: string;
  converted_at: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h`;
}

function sessionDuration(started: string): string {
  const secs = Math.floor((Date.now() - new Date(started).getTime()) / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}:${s.toString().padStart(2, "0")}`;
}

function statusColor(status: string, isHuman: boolean): string {
  if (isHuman) return "#ef4444"; // red - takeover
  if (status === "active") return "#4ade80";
  if (status === "idle") return "#fbbf24";
  if (status === "converted") return "#4ade80";
  if (status === "abandoned") return "#52525b";
  return "#71717a";
}

function statusLabel(status: string, isHuman: boolean): string {
  if (isHuman) return "TAKEOVER";
  return status.toUpperCase();
}

function extractPageName(url: string | null): string {
  if (!url) return "Unknown page";
  try {
    const path = new URL(url).pathname;
    return path === "/" ? "Homepage" : path;
  } catch {
    return url;
  }
}

function lastMessage(session: LiveSession): string {
  const msgs = session.messages || [];
  const last = msgs.filter(m => m.role === "user").pop();
  return last?.content?.slice(0, 80) || "...";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchellieLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selected, setSelected] = useState<LiveSession | null>(null);
  const [takeoverText, setTakeoverText] = useState("");
  const [sending, setSending] = useState(false);
  const [todayStats, setTodayStats] = useState({ active: 0, today: 0, conversions: 0, avgDuration: "0:00" });
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch all sessions from today
  const fetchSessions = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("schellie_sessions")
      .select("*")
      .gte("started_at", today.toISOString())
      .order("last_message_at", { ascending: false });

    const all = (data ?? []) as LiveSession[];
    setSessions(all);

    // Update stats
    const active = all.filter(s => s.status === "active" || s.is_human_controlled).length;
    const conversions = all.filter(s => s.lead_captured).length;
    const durations = all.map(s => (Date.now() - new Date(s.started_at).getTime()) / 1000);
    const avg = durations.length > 0 ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgM = Math.floor(avg / 60);
    const avgS = avg % 60;

    setTodayStats({
      active,
      today: all.length,
      conversions,
      avgDuration: `${avgM}:${avgS.toString().padStart(2, "0")}`,
    });

    // Refresh selected session
    if (selected) {
      const updated = all.find(s => s.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    fetchSessions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("schellie-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "schellie_sessions" }, () => {
        fetchSessions();
      })
      .subscribe();

    channelRef.current = channel;

    // Refresh timer (fallback for staleness detection)
    const interval = setInterval(fetchSessions, 15000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchSessions]);

  // Take over a session
  async function handleTakeover(session: LiveSession) {
    await supabase.from("schellie_sessions").update({
      is_human_controlled: true,
      human_agent_id: null, // TODO: set to logged-in user ID
      takeover_at: new Date().toISOString(),
      status: "active",
    }).eq("id", session.id);
    fetchSessions();
  }

  // Return to AI
  async function handleReturnToAI(session: LiveSession) {
    await supabase.from("schellie_sessions").update({
      is_human_controlled: false,
      human_agent_id: null,
      pending_human_response: null,
    }).eq("id", session.id);
    setTakeoverText("");
    fetchSessions();
  }

  // Send human message
  async function handleSendMessage(session: LiveSession) {
    if (!takeoverText.trim()) return;
    setSending(true);

    // Add message to the messages array
    const newMsg = { role: "assistant", content: takeoverText.trim(), ts: new Date().toISOString(), source: "human" };
    const updatedMessages = [...(session.messages || []), newMsg];

    await supabase.from("schellie_sessions").update({
      pending_human_response: takeoverText.trim(),
      messages: updatedMessages,
      message_count: updatedMessages.length,
      last_message_at: new Date().toISOString(),
    }).eq("id", session.id);

    setTakeoverText("");
    setSending(false);
    fetchSessions();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#09090b" }}>
      {/* Stats Bar */}
      <div style={{
        display: "flex", gap: 24, padding: "12px 24px",
        borderBottom: "1px solid #27272a", backgroundColor: "#0d0d0d", flexShrink: 0,
      }}>
        {[
          { label: "Active", value: todayStats.active, color: "#4ade80" },
          { label: "Today", value: todayStats.today, color: "#fafafa" },
          { label: "Conversions", value: todayStats.conversions, color: "#80B602" },
          { label: "Avg Duration", value: todayStats.avgDuration, color: "#a1a1aa" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main: 50/50 split */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Session List */}
        <div style={{ flex: "0 0 50%", borderRight: "1px solid #27272a", overflowY: "auto", padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Live Sessions
          </div>

          {sessions.length === 0 ? (
            <div style={{ color: "#52525b", fontSize: 13, padding: 24, textAlign: "center" }}>
              No active Schellie sessions today
            </div>
          ) : (
            sessions.map(s => {
              const isSelected = selected?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={{
                    padding: "12px 16px", marginBottom: 8, borderRadius: 8, cursor: "pointer",
                    backgroundColor: isSelected ? "#1a1a2e" : "#18181b",
                    border: `1px solid ${isSelected ? "#3b82f6" : "#27272a"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        backgroundColor: statusColor(s.status, s.is_human_controlled),
                        boxShadow: s.status === "active" ? `0 0 6px ${statusColor(s.status, s.is_human_controlled)}` : "none",
                      }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: statusColor(s.status, s.is_human_controlled) }}>
                        {statusLabel(s.status, s.is_human_controlled)}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: "#52525b" }}>
                      {sessionDuration(s.started_at)} · {s.message_count} msgs
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
                    {extractPageName(s.page_url)}
                    {s.geo_city && ` · ${s.geo_city}, ${s.geo_region}`}
                  </div>

                  <div style={{ fontSize: 11, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    "{lastMessage(s)}"
                  </div>

                  {s.utm_source && (
                    <div style={{ fontSize: 9, color: "#52525b", marginTop: 4 }}>
                      {s.utm_source}/{s.utm_campaign}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: Conversation Detail */}
        <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#52525b", fontSize: 13 }}>
              Select a session to view conversation
            </div>
          ) : (
            <>
              {/* Visitor Context */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #27272a", backgroundColor: "#0d0d0d", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "#71717a" }}>
                  {extractPageName(selected.page_url)}
                  {selected.geo_city && ` · ${selected.geo_city}, ${selected.geo_region}`}
                </div>
                <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>
                  {selected.message_count} messages · {sessionDuration(selected.started_at)}
                  {selected.utm_source && ` · ${selected.utm_source}/${selected.utm_campaign}`}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {(selected.messages || []).map((msg, i) => {
                  const isAssistant = msg.role === "assistant";
                  const isHumanAgent = msg.source === "human";
                  return (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: isAssistant ? "flex-start" : "flex-end",
                      marginBottom: 8,
                    }}>
                      <div style={{
                        maxWidth: "75%",
                        padding: "8px 12px",
                        borderRadius: 12,
                        backgroundColor: isAssistant
                          ? (isHumanAgent ? "#1e1b4b" : "#18181b")
                          : "#172554",
                        border: `1px solid ${isAssistant ? (isHumanAgent ? "#4338ca" : "#27272a") : "#1e40af"}`,
                      }}>
                        {isAssistant && (
                          <div style={{ fontSize: 9, color: isHumanAgent ? "#818cf8" : "#9f1239", marginBottom: 2, fontWeight: 600 }}>
                            {isHumanAgent ? "Agent" : "Schellie"}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "#e5e5e5", lineHeight: 1.5 }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid #27272a", backgroundColor: "#0d0d0d", flexShrink: 0 }}>
                {selected.is_human_controlled ? (
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <input
                        type="text"
                        value={takeoverText}
                        onChange={e => setTakeoverText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSendMessage(selected)}
                        placeholder="Type your response..."
                        autoFocus
                        style={{
                          flex: 1, padding: "8px 12px", backgroundColor: "#18181b",
                          border: "1px solid #ef4444", borderRadius: 6,
                          color: "#fafafa", fontSize: 12, outline: "none",
                        }}
                      />
                      <button
                        onClick={() => handleSendMessage(selected)}
                        disabled={sending || !takeoverText.trim()}
                        style={{
                          padding: "8px 16px", borderRadius: 6, border: "none",
                          backgroundColor: "#ef4444", color: "#fff",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          opacity: sending || !takeoverText.trim() ? 0.5 : 1,
                        }}
                      >Send</button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleReturnToAI(selected)} style={{
                        padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                        backgroundColor: "#18181b", color: "#4ade80", fontSize: 10, cursor: "pointer",
                      }}>Return to AI</button>
                      <span style={{ fontSize: 10, color: "#ef4444", display: "flex", alignItems: "center" }}>
                        You are controlling this conversation
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleTakeover(selected)} style={{
                      padding: "8px 16px", borderRadius: 6, border: "1px solid #ef4444",
                      backgroundColor: "#1a0000", color: "#ef4444",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>Take Over</button>
                    {selected.lead_captured && selected.opportunity_id && (
                      <button onClick={() => window.location.href = `/queue`} style={{
                        padding: "8px 16px", borderRadius: 6, border: "1px solid #80B602",
                        backgroundColor: "#0a1a00", color: "#80B602",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>Open in Queue</button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
