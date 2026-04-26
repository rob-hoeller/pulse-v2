"use client";

import Link from "next/link";

const SETTINGS_SECTIONS = [
  {
    icon: "",
    title: "Response Templates",
    description: "Customize auto-confirmations, personal follow-ups, and SMS messages per web form type and division.",
    href: "/settings/templates",
  },
  {
    icon: "",
    title: "Profile",
    description: "Your name, email, phone, and Zoom number. Used in merge variables for email templates.",
    href: "/settings/profile",
  },
  {
    icon: "",
    title: "Notifications",
    description: "Configure push notifications, alert thresholds, and digest preferences.",
    href: "/settings/notifications",
  },
  {
    icon: "",
    title: "AI & Automation",
    description: "System mode (Manual/Assisted/Auto), scoring thresholds, and agent configuration.",
    href: "/settings/automation",
  },
  {
    icon: "",
    title: "Integrations",
    description: "SendGrid, Microsoft Outlook, Zoom Phone, Rilla API connections and status.",
    href: "/settings/integrations",
  },
  {
    icon: "",
    title: "Team",
    description: "Manage OSC and CSM team members, community assignments, and roles.",
    href: "/settings/team",
  },
  {
    icon: "",
    title: "SLA Timers",
    description: "Configure response time targets for queues, communications, and prospect follow-ups. Drives alerts and escalation.",
    href: "/settings/sla",
  },
];

export default function SettingsPage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, backgroundColor: "#09090b", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>Settings</h1>
      <p style={{ fontSize: 14, color: "#71717a", marginBottom: 32 }}>
        Configure your Pv2 CRM experience.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {SETTINGS_SECTIONS.map(section => (
          <Link key={section.href} href={section.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: "20px 24px",
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {section.icon && <span style={{ fontSize: 20 }}>{section.icon}</span>}
                <span style={{ fontSize: 15, fontWeight: 600, color: "#fafafa" }}>{section.title}</span>
              </div>
              <p style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6, margin: 0 }}>
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
