"use client";

import { useState } from "react";
import Link from "next/link";

interface Doc {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  sort_order: number;
  updated_at: string;
}

interface Props {
  docs: Doc[];
  initialSlug?: string;
}

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "#"            },
  { icon: "⊕", label: "Leads",         href: "/leads"       },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
  { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
  { icon: "📄", label: "Docs",          href: "/docs"        },
];

const CAT_LABELS: Record<string, string> = {
  company:   "Company",
  platform:  "Platform",
  data:      "Data",
  technical: "Technical",
  processes: "Processes",
  general:   "General",
};

const CAT_ORDER = ["company", "platform", "data", "technical", "processes", "general"];

function renderMarkdown(content: string): string {
  return content
    // Code blocks (must come before inline code)
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre style="background:#111111;border:1px solid #1f1f1f;border-radius:6px;padding:14px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:monospace;font-size:12px;color:#a1a1a1;line-height:1.6">$2</code></pre>'
    )
    // H1
    .replace(
      /^# (.+)$/gm,
      '<h1 style="color:#ededed;font-size:20px;font-weight:700;margin:0 0 16px;line-height:1.3">$1</h1>'
    )
    // H2
    .replace(
      /^## (.+)$/gm,
      '<h2 style="color:#ededed;font-size:15px;font-weight:600;margin:24px 0 10px;padding-top:24px;border-top:1px solid #1f1f1f">$1</h2>'
    )
    // H3
    .replace(
      /^### (.+)$/gm,
      '<h3 style="color:#a1a1a1;font-size:13px;font-weight:600;margin:16px 0 8px">$1</h3>'
    )
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ededed;font-weight:600">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:#a1a1a1">$1</em>')
    // Code inline
    .replace(
      /`(.+?)`/g,
      '<code style="background:#161616;border:1px solid #2a2a2a;border-radius:3px;padding:1px 5px;font-family:monospace;font-size:11px;color:#a855f7">$1</code>'
    )
    // Links
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" style="color:#0070f3;text-decoration:none" target="_blank">$1</a>'
    )
    // Tables — convert rows (skip separator lines)
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.includes("---")) return "";
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      return `<tr>${cells
        .map(
          (c) =>
            `<td style="padding:6px 12px;border-bottom:1px solid #1a1a1a;color:#a1a1a1;font-size:12px">${c}</td>`
        )
        .join("")}</tr>`;
    })
    // Unordered list items
    .replace(
      /^- (.+)$/gm,
      '<li style="color:#a1a1a1;font-size:13px;margin:4px 0;padding-left:4px">$1</li>'
    )
    // Wrap consecutive <li> in <ul>
    .replace(
      /(<li[^>]*>.*<\/li>\n?)+/g,
      (m) => `<ul style="margin:8px 0;padding-left:20px;list-style:disc">${m}</ul>`
    )
    // Wrap consecutive <tr> in table
    .replace(
      /(<tr>.*<\/tr>\n?)+/g,
      (m) =>
        `<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;background:#111111;border:1px solid #1f1f1f;border-radius:6px">${m}</table></div>`
    )
    // Paragraphs (lines with content not already tagged)
    .replace(
      /^(?!<[hupldt])(.+)$/gm,
      '<p style="color:#a1a1a1;font-size:13px;line-height:1.7;margin:6px 0">$1</p>'
    )
    // Blank lines
    .replace(/^\s*$/gm, "");
}

export default function DocsClient({ docs, initialSlug }: Props) {
  const [activeSlug, setActiveSlug] = useState(
    initialSlug ?? docs[0]?.slug ?? ""
  );

  const activeDoc = docs.find((d) => d.slug === activeSlug) ?? docs[0];

  // Group docs by category, preserving canonical order
  const grouped = CAT_ORDER.reduce<Record<string, Doc[]>>((acc, cat) => {
    const items = docs.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // Also catch any categories not in CAT_ORDER
  docs.forEach((d) => {
    if (!CAT_ORDER.includes(d.category)) {
      if (!grouped[d.category]) grouped[d.category] = [];
      if (!grouped[d.category].includes(d)) grouped[d.category].push(d);
    }
  });

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Global nav sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] h-screen sticky top-0">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="text-base">🦞</span>
            <div>
              <span className="font-semibold text-[13px] text-[#ededed]">Pulse v2</span>
              <div className="text-[10px] text-[#555]">HBx AI Factory</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                item.href === "/docs"
                  ? "bg-[#1a1a1a] text-[#ededed]"
                  : "text-[#888] hover:text-[#ededed] hover:bg-[#111111]"
              }`}
            >
              <span className="text-[14px] w-4 text-center opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs">
                🦞
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#00c853] rounded-full border border-[#0a0a0a] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#ededed] truncate">Schellie</div>
              <div className="text-[11px] text-[#555] truncate">Orchestrator · Online</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Docs sidebar — doc navigation */}
      <aside className="w-[200px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#080808] h-screen sticky top-0 overflow-y-auto">
        {Object.entries(grouped).map(([cat, catDocs]) => (
          <div key={cat}>
            <div className="text-[10px] font-medium text-[#444] uppercase tracking-widest px-3 pt-4 pb-1">
              {CAT_LABELS[cat] ?? cat}
            </div>
            {catDocs.map((doc) => (
              <button
                key={doc.slug}
                onClick={() => setActiveSlug(doc.slug)}
                className={`w-full text-left text-[12px] px-3 py-1.5 cursor-pointer rounded mx-1 transition-colors ${
                  activeSlug === doc.slug
                    ? "bg-[#1a1a1a] text-[#ededed]"
                    : "text-[#666] hover:text-[#a1a1a1] hover:bg-[#111111]"
                }`}
                style={{ width: "calc(100% - 8px)" }}
              >
                {doc.title}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3 flex items-center justify-between">
          <h1 className="text-[14px] font-semibold text-[#ededed]">Docs</h1>
          <span className="text-[11px] text-[#555]">{docs.length} documents</span>
        </div>

        {/* Doc content */}
        {activeDoc ? (
          <div>
            <div
              className="px-8 py-6 max-w-[800px]"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeDoc.content) }}
            />
            <div className="px-8 max-w-[800px]">
              <div className="text-[11px] text-[#444] mt-8 pt-4 border-t border-[#1a1a1a]">
                Last updated:{" "}
                {new Date(activeDoc.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-8 py-6 text-[13px] text-[#444]">No documents found.</div>
        )}
      </main>
    </div>
  );
}
