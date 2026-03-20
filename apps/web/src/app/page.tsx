"use client";

const agents = [
  {
    emoji: "🦞",
    name: "Schellie",
    role: "Mission Control / Orchestrator",
    description: "Coordinates all agents, routes tasks, interfaces with Lance. The brain of the operation.",
    tags: ["Orchestration", "Strategy", "Routing"],
    status: "ONLINE",
    tier: 1,
  },
  {
    emoji: "🐟",
    name: "Nemo",
    role: "Execution Sandbox",
    description: "Heavy execution inside OpenShell. Code runner, DB ops, schema migrations.",
    tags: ["Code", "Database", "Secure"],
    status: "READY",
    tier: 2,
  },
  {
    emoji: "💬",
    name: "Shelley",
    role: "AI Sales Counselor",
    description: "Buyer conversations, competitive intel, AI-powered personalized follow-ups.",
    tags: ["Conversations", "AI Nurture", "CRM"],
    status: "STANDBY",
    tier: 2,
  },
  {
    emoji: "🔍",
    name: "Competitive Analysis",
    role: "Research Agent",
    description: "Sweeps competitor communities, pricing, incentives. Feeds Shelley's knowledge base.",
    tags: ["Research", "Intel", "Automation"],
    status: "STANDBY",
    tier: 2,
  },
  {
    emoji: "🗺️",
    name: "Pv1 Discovery",
    role: "Codebase Analyst",
    description: "Maps the Pv1 codebase, DB schema, and business logic. Phase 1 agent.",
    tags: ["Discovery", "Analysis", "PHP"],
    status: "PLANNED",
    tier: 3,
  },
  {
    emoji: "🏗️",
    name: "Schema Migration",
    role: "DB Architect",
    description: "Translates Pv1 schema to Pv2 canonical design. Generates and runs DDL.",
    tags: ["Schema", "Migration", "DDL"],
    status: "PLANNED",
    tier: 3,
  },
  {
    emoji: "⚡",
    name: "Code Builder",
    role: "Pv2 Developer",
    description: "Generates services, APIs, UI components, and tests for Pv2.",
    tags: ["TypeScript", "Next.js", "APIs"],
    status: "PLANNED",
    tier: 3,
  },
  {
    emoji: "🧪",
    name: "QA Parity",
    role: "Quality Agent",
    description: "Compares Pv1 vs Pv2 behavior, regression analysis, confidence scoring.",
    tags: ["QA", "Parity", "Testing"],
    status: "PLANNED",
    tier: 3,
  },
  {
    emoji: "🧠",
    name: "AI Feature",
    role: "Intelligence Layer",
    description: "Buying signals, next-best-action, lead summaries, follow-up prioritization.",
    tags: ["AI", "Signals", "Insights"],
    status: "PLANNED",
    tier: 3,
  },
];

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  ONLINE: { label: "ONLINE", color: "text-green-400", dot: "bg-green-400" },
  READY: { label: "READY", color: "text-blue-400", dot: "bg-blue-400" },
  STANDBY: { label: "STANDBY", color: "text-yellow-400", dot: "bg-yellow-400" },
  PLANNED: { label: "PLANNED", color: "text-slate-500", dot: "bg-slate-500" },
};

const tagColors = [
  "bg-green-900/40 text-green-400 border-green-800",
  "bg-blue-900/40 text-blue-400 border-blue-800",
  "bg-purple-900/40 text-purple-400 border-purple-800",
  "bg-orange-900/40 text-orange-400 border-orange-800",
  "bg-cyan-900/40 text-cyan-400 border-cyan-800",
];

const navItems = [
  { emoji: "📊", label: "Overview", active: true },
  { emoji: "🤖", label: "Agents" },
  { emoji: "✅", label: "Tasks" },
  { emoji: "👥", label: "Leads" },
  { emoji: "🏘️", label: "Communities" },
  { emoji: "📅", label: "Calendar" },
  { emoji: "🔔", label: "Notifications" },
  { emoji: "⚙️", label: "Settings" },
];

const stats = [
  { label: "Active Leads", value: "0", trend: "—" },
  { label: "Prospects", value: "0", trend: "—" },
  { label: "Agents Online", value: "2", trend: "↑" },
  { label: "Tasks Pending", value: "0", trend: "—" },
];

function AgentCard({ agent, large = false }: { agent: typeof agents[0]; large?: boolean }) {
  const sc = statusConfig[agent.status];
  return (
    <div
      className={`bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#76b900]/40 transition-all duration-200 ${
        large ? "w-full max-w-xl mx-auto" : "flex-1 min-w-0"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1e1e2e] flex items-center justify-center text-2xl">
            {agent.emoji}
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{agent.name}</div>
            <div className="text-xs text-slate-400">{agent.role}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${agent.status === "ONLINE" ? "animate-pulse" : ""}`} />
          {sc.label}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3 leading-relaxed">{agent.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {agent.tags.map((tag, i) => (
          <span
            key={tag}
            className={`text-xs px-2 py-0.5 rounded-full border ${tagColors[i % tagColors.length]}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MissionControl() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const tier1 = agents.filter((a) => a.tier === 1);
  const tier2 = agents.filter((a) => a.tier === 2);
  const tier3 = agents.filter((a) => a.tier === 3);

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-[#1e1e2e]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🦞</span>
            <div>
              <div className="font-bold text-white text-sm leading-tight">Pulse v2</div>
              <div className="text-[11px] font-medium" style={{ color: "#76b900" }}>
                Mission Control
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                item.active
                  ? "bg-[#76b900]/10 text-white border-l-2 border-[#76b900] pl-[10px]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a25]"
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Agent status */}
        <div className="p-4 border-t border-[#1e1e2e]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#1e1e2e] flex items-center justify-center text-sm">🦞</div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-[#0d0d14] animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Schellie</div>
              <div className="text-[10px] text-slate-500">Mission Control · Online</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur border-b border-[#1e1e2e] px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Mission Control</h1>
            <p className="text-xs text-slate-500">{dateStr}</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-black transition-all hover:opacity-90"
            style={{ backgroundColor: "#76b900" }}
          >
            <span>+</span> New Task
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5"
                style={{ borderTop: "2px solid #76b900" }}
              >
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Agents */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Meet the Team</h2>
                <p className="text-xs text-slate-500 mt-0.5">9 AI agents across 2 security tiers</p>
              </div>
            </div>

            {/* Tier 1 */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[#1e1e2e]" />
                <span className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase px-2">
                  Tier 1 — Mission Control
                </span>
                <div className="h-px flex-1 bg-[#1e1e2e]" />
              </div>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <AgentCard agent={tier1[0]} large />
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center mb-1">
              <div className="w-px h-6 bg-[#1e1e2e]" />
            </div>

            {/* Tier 2 Active */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[#1e1e2e]" />
                <span className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase px-2">
                  Tier 2 — Active Agents
                </span>
                <div className="h-px flex-1 bg-[#1e1e2e]" />
              </div>
              <div className="flex gap-4">
                {tier2.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center mb-1">
              <div className="w-px h-6 bg-[#1e1e2e]" />
            </div>

            {/* Tier 2 Planned */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[#1e1e2e]" />
                <span className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase px-2">
                  Tier 2 — Planned Agents
                </span>
                <div className="h-px flex-1 bg-[#1e1e2e]" />
              </div>
              <div className="flex gap-4">
                {tier3.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">🦞</div>
              <div className="text-sm text-slate-400">No activity yet.</div>
              <div className="text-xs text-slate-600 mt-1">Agents are standing by.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
