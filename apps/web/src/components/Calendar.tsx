"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarProps {
  communityId?: string | null;
  divisionId?: string | null;
  userId?: string | null;
  compact?: boolean;
}

interface CalendarEvent {
  id: string;
  contact_id: string | null;
  channel: "zoom_meeting" | "rilla" | "walk_in";
  subject: string | null;
  occurred_at: string;
  duration_sec: number | null;
  community_id: string | null;
  contacts: { first_name: string | null; last_name: string | null } | null;
}

type ViewMode = "month" | "week";

// ── Helpers ───────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

const CHANNEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  zoom_meeting: { bg: "#1d4ed8", text: "#93c5fd", dot: "#3b82f6" },
  rilla: { bg: "#166534", text: "#86efac", dot: "#22c55e" },
  walk_in: { bg: "#581c87", text: "#c084fc", dot: "#a855f7" },
};

const CHANNEL_LABELS: Record<string, string> = {
  zoom_meeting: "Zoom",
  rilla: "Rilla",
  walk_in: "Walk-in",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "p" : "a";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, "0")}${ampm}`;
}

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const start = new Date(year, month, 1 - startDay);
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function getWeekDates(d: Date): Date[] {
  const day = d.getDay();
  const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + i));
  }
  return dates;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Calendar({ communityId, divisionId, userId, compact = false }: CalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Compute visible range
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === "month") {
      const grid = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
      return { rangeStart: grid[0][0], rangeEnd: grid[grid.length - 1][6] };
    }
    const weekDates = getWeekDates(viewDate);
    return { rangeStart: weekDates[0], rangeEnd: weekDates[6] };
  }, [viewDate, viewMode]);

  // Fetch events
  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      setLoading(true);
      const start = rangeStart.toISOString();
      const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() + 1).toISOString();

      let query = supabase
        .from("activities")
        .select("id, contact_id, channel, subject, occurred_at, duration_sec, community_id, contacts(first_name, last_name)")
        .in("channel", ["zoom_meeting", "rilla", "walk_in"])
        .gte("occurred_at", start)
        .lte("occurred_at", end)
        .order("occurred_at");

      if (communityId) query = query.eq("community_id", communityId);
      if (divisionId) query = query.eq("division_id", divisionId);
      if (userId) query = query.eq("user_id", userId);

      const { data } = await query;
      if (!cancelled) {
        setEvents((data as CalendarEvent[] | null) ?? []);
        setLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd, communityId, divisionId, userId]);

  // Events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.occurred_at.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Upcoming events (next 5 from today)
  const upcoming = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.occurred_at) >= now)
      .slice(0, 5);
  }, [events]);

  // Navigation
  const goToday = useCallback(() => setViewDate(startOfDay(new Date())), []);
  const goPrev = useCallback(() => {
    setViewDate((d) => {
      if (viewMode === "month") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
    });
  }, [viewMode]);
  const goNext = useCallback(() => {
    setViewDate((d) => {
      if (viewMode === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    });
  }, [viewMode]);

  const headerLabel =
    viewMode === "month"
      ? `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
      : (() => {
          const wd = getWeekDates(viewDate);
          const s = wd[0];
          const e = wd[6];
          if (s.getMonth() === e.getMonth()) {
            return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
          }
          return `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} – ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`;
        })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", minHeight: 0 }}>
      {/* Main calendar area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: compact ? "8px 12px" : "12px 16px",
            borderBottom: "1px solid #27272a",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: compact ? 15 : 18, fontWeight: 600, color: "#fafafa" }}>
              {headerLabel}
            </span>
            {loading && (
              <span style={{ fontSize: 11, color: "#71717a" }}>Loading…</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* View toggle */}
            <div
              style={{
                display: "flex",
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid #27272a",
              }}
            >
              {(["month", "week"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    background: viewMode === mode ? "#27272a" : "transparent",
                    color: viewMode === mode ? "#fafafa" : "#71717a",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            {/* Nav */}
            <button onClick={goPrev} style={navBtnStyle}>←</button>
            <button onClick={goToday} style={{ ...navBtnStyle, fontSize: 11, padding: "4px 10px" }}>Today</button>
            <button onClick={goNext} style={navBtnStyle}>→</button>
            {/* New Meeting placeholder */}
            {!compact && (
              <button
                disabled
                style={{
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#fafafa",
                  color: "#09090b",
                  border: "none",
                  borderRadius: 6,
                  cursor: "not-allowed",
                  opacity: 0.5,
                  marginLeft: 4,
                }}
              >
                + New Meeting
              </button>
            )}
          </div>
        </div>

        {/* Calendar body */}
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {viewMode === "month" ? (
            <MonthView
              viewDate={viewDate}
              today={today}
              eventsByDate={eventsByDate}
              compact={compact}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          ) : (
            <WeekView
              viewDate={viewDate}
              today={today}
              events={events}
              compact={compact}
            />
          )}
        </div>
      </div>

      {/* Right sidebar — upcoming meetings */}
      {!compact && (
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderLeft: "1px solid #27272a",
            background: "#0a0a0b",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", marginBottom: 12 }}>
            Upcoming Meetings
          </div>
          {upcoming.length === 0 && (
            <div style={{ fontSize: 12, color: "#52525b" }}>No upcoming meetings</div>
          )}
          {upcoming.map((ev) => {
            const d = new Date(ev.occurred_at);
            const colors = CHANNEL_COLORS[ev.channel] || CHANNEL_COLORS.zoom_meeting;
            const contactName = ev.contacts
              ? `${ev.contacts.first_name ?? ""} ${ev.contacts.last_name ?? ""}`.trim()
              : null;
            return (
              <div
                key={ev.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "#18181b",
                  marginBottom: 8,
                  border: "1px solid #27272a",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: colors.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                    {CHANNEL_LABELS[ev.channel] ?? ev.channel}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#fafafa",
                    marginBottom: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ev.subject || contactName || "Meeting"}
                </div>
                <div style={{ fontSize: 11, color: "#71717a" }}>
                  {MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()} · {formatTime(d)}
                  {ev.duration_sec ? ` · ${Math.round(ev.duration_sec / 60)}m` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthView({
  viewDate,
  today,
  eventsByDate,
  compact,
  selectedDay,
  onSelectDay,
}: {
  viewDate: Date;
  today: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  compact: boolean;
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
}) {
  const grid = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
  const cellH = compact ? 72 : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #27272a" }}>
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              padding: "6px 0",
              fontSize: 11,
              fontWeight: 500,
              color: "#71717a",
              borderRight: "1px solid #27272a",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      {grid.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: cellH }}>
          {week.map((day, di) => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const dateKey = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, "0")}-${day.getDate().toString().padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateKey] || [];
            const maxVisible = compact ? 2 : 3;

            return (
              <div
                key={di}
                onClick={() => onSelectDay(day)}
                style={{
                  borderRight: "1px solid #27272a",
                  borderBottom: "1px solid #27272a",
                  padding: "4px",
                  minHeight: cellH,
                  background: isToday ? "#18181b" : isSelected ? "#111113" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: compact ? 11 : 12,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? "#fafafa" : isCurrentMonth ? "#d4d4d8" : "#3f3f46",
                    marginBottom: 2,
                    textAlign: "right",
                    paddingRight: 2,
                  }}
                >
                  {isToday ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {day.getDate()}
                    </span>
                  ) : (
                    day.getDate()
                  )}
                </div>
                {dayEvents.slice(0, maxVisible).map((ev) => (
                  <EventBar key={ev.id} event={ev} compact={compact} />
                ))}
                {dayEvents.length > maxVisible && (
                  <div style={{ fontSize: 9, color: "#71717a", padding: "1px 2px" }}>
                    +{dayEvents.length - maxVisible} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

const HOUR_START = 7;
const HOUR_END = 20; // 8pm
const HOUR_HEIGHT = 52;

function WeekView({
  viewDate,
  today,
  events,
  compact,
}: {
  viewDate: Date;
  today: Date;
  events: CalendarEvent[];
  compact: boolean;
}) {
  const weekDates = getWeekDates(viewDate);
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  // Group events by day-of-week index
  const eventsByCol = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const ev of events) {
      const d = new Date(ev.occurred_at);
      for (let i = 0; i < 7; i++) {
        if (isSameDay(d, weekDates[i])) {
          map[i].push(ev);
          break;
        }
      }
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, viewDate]);

  const totalHeight = hours.length * HOUR_HEIGHT;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `56px repeat(7, 1fr)`,
          borderBottom: "1px solid #27272a",
          flexShrink: 0,
        }}
      >
        <div style={{ borderRight: "1px solid #27272a" }} />
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: "8px 0 4px",
                borderRight: "1px solid #27272a",
              }}
            >
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>{DAYS[i]}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "#3b82f6" : "#d4d4d8",
                }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `56px repeat(7, 1fr)`,
            position: "relative",
            minHeight: totalHeight,
          }}
        >
          {/* Time labels */}
          <div style={{ borderRight: "1px solid #27272a" }}>
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  height: HOUR_HEIGHT,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  paddingRight: 8,
                  paddingTop: 2,
                  fontSize: 10,
                  color: "#52525b",
                  borderBottom: "1px solid #1a1a1e",
                }}
              >
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((_, colIdx) => (
            <div
              key={colIdx}
              style={{
                borderRight: "1px solid #27272a",
                position: "relative",
              }}
            >
              {/* Hour lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    height: HOUR_HEIGHT,
                    borderBottom: "1px solid #1a1a1e",
                  }}
                />
              ))}
              {/* Events */}
              {(eventsByCol[colIdx] || []).map((ev) => {
                const d = new Date(ev.occurred_at);
                const minutesSinceStart = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
                if (minutesSinceStart < 0) return null;
                const top = (minutesSinceStart / 60) * HOUR_HEIGHT;
                const durationMin = ev.duration_sec ? ev.duration_sec / 60 : 30;
                const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 20);
                const colors = CHANNEL_COLORS[ev.channel] || CHANNEL_COLORS.zoom_meeting;
                const contactName = ev.contacts
                  ? `${ev.contacts.first_name ?? ""} ${ev.contacts.last_name ?? ""}`.trim()
                  : null;

                return (
                  <div
                    key={ev.id}
                    style={{
                      position: "absolute",
                      top,
                      left: 2,
                      right: 2,
                      height,
                      background: colors.bg,
                      color: colors.text,
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: 10,
                      overflow: "hidden",
                      cursor: "default",
                      border: `1px solid ${colors.dot}33`,
                    }}
                  >
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {formatTime(d)} {ev.subject || contactName || "Meeting"}
                    </div>
                    {height > 30 && contactName && ev.subject && (
                      <div style={{ fontSize: 9, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {contactName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Event Bar (Month view) ────────────────────────────────────────────────────

function EventBar({ event, compact }: { event: CalendarEvent; compact: boolean }) {
  const d = new Date(event.occurred_at);
  const colors = CHANNEL_COLORS[event.channel] || CHANNEL_COLORS.zoom_meeting;
  const contactName = event.contacts
    ? `${event.contacts.first_name ?? ""} ${event.contacts.last_name ?? ""}`.trim()
    : null;

  return (
    <div
      style={{
        height: compact ? 16 : 18,
        background: colors.bg,
        color: colors.text,
        fontSize: compact ? 9 : 10,
        borderRadius: 3,
        margin: "1px 2px",
        padding: "0 4px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        whiteSpace: "nowrap",
        cursor: "default",
      }}
    >
      <span style={{ fontWeight: 600, marginRight: 3 }}>{formatTime(d)}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {event.subject || contactName || CHANNEL_LABELS[event.channel] || "Meeting"}
      </span>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 13,
  background: "transparent",
  color: "#a1a1aa",
  border: "1px solid #27272a",
  borderRadius: 6,
  cursor: "pointer",
};
