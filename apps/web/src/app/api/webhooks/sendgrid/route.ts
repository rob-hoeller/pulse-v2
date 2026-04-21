/**
 * SendGrid Event Webhook Handler
 * 
 * Receives real-time events from SendGrid:
 * - bounce → auto-delete contact from Queue
 * - delivered → mark as verified
 * - dropped → auto-delete
 * - opened/clicked → update engagement
 * 
 * POST /api/webhooks/sendgrid
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

const ORG_ID = "00000000-0000-0000-0000-000000000001";

interface SendGridEvent {
  email: string;
  event: string;       // bounce, delivered, dropped, open, click, deferred, spam_report
  reason?: string;
  timestamp: number;
  sg_message_id?: string;
  category?: string[];
  type?: string;        // for bounces: "bounce" or "blocked"
  status?: string;      // SMTP status code
  url?: string;         // for clicks
}

export async function POST(request: Request) {
  try {
    const events: SendGridEvent[] = await request.json();
    const supabase = getSupabase();

    let bounced = 0;
    let delivered = 0;
    let opened = 0;
    let dropped = 0;

    for (const event of events) {
      const email = event.email?.toLowerCase();
      if (!email) continue;

      // Find the contact by email
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .or(`email.eq.${email},email_secondary.eq.${email}`)
        .limit(1);

      const contactId = contacts?.[0]?.id;

      switch (event.event) {
        case "bounce":
        case "dropped": {
          // AUTO-DELETE: move all opportunities to "deleted"
          if (contactId) {
            const { data: opps } = await supabase
              .from("opportunities")
              .select("id, crm_stage")
              .eq("contact_id", contactId)
              .neq("crm_stage", "deleted");

            for (const opp of opps ?? []) {
              await supabase
                .from("opportunities")
                .update({ crm_stage: "deleted", is_active: false })
                .eq("id", opp.id);

              await supabase.from("stage_transitions").insert({
                org_id: ORG_ID,
                opportunity_id: opp.id,
                contact_id: contactId,
                from_stage: opp.crm_stage,
                to_stage: "deleted",
                triggered_by: "agent",
                agent_name: "sendgrid_bounce_agent",
                reason: `Email bounced: ${event.reason ?? event.type ?? "undeliverable"} (${email})`,
              });
            }

            // Log to action_log
            await supabase.from("action_log").insert({
              org_id: ORG_ID,
              action_type: "auto_delete_bounce",
              entity_type: "contact",
              entity_id: contactId,
              triggered_by: "agent",
              agent_name: "sendgrid_bounce_agent",
              reasoning: `Email ${event.event}: ${event.reason ?? "undeliverable"}`,
              details: { email, event_type: event.event, reason: event.reason, status: event.status },
            });

            if (event.event === "bounce") bounced++;
            else dropped++;
          }
          break;
        }

        case "delivered": {
          // Mark contact as email-verified
          if (contactId) {
            // Record delivery as activity
            await supabase.from("activities").insert({
              org_id: ORG_ID,
              contact_id: contactId,
              channel: "email",
              direction: "outbound",
              type: "email_delivered",
              subject: `Email delivered to ${email}`,
              occurred_at: new Date(event.timestamp * 1000).toISOString(),
              triggered_by: "agent",
              agent_name: "sendgrid_delivery_agent",
            });
            delivered++;
          }
          break;
        }

        case "open": {
          // Record email open as engagement signal
          if (contactId) {
            await supabase.from("activities").insert({
              org_id: ORG_ID,
              contact_id: contactId,
              channel: "email",
              direction: "inbound",
              type: "email_opened",
              subject: `Opened email`,
              occurred_at: new Date(event.timestamp * 1000).toISOString(),
              triggered_by: "agent",
              agent_name: "sendgrid_engagement_agent",
            });
            opened++;
          }
          break;
        }

        case "click": {
          // Record link click as high engagement signal
          if (contactId) {
            await supabase.from("activities").insert({
              org_id: ORG_ID,
              contact_id: contactId,
              channel: "email",
              direction: "inbound",
              type: "email_clicked",
              subject: `Clicked link: ${event.url ?? "unknown"}`,
              occurred_at: new Date(event.timestamp * 1000).toISOString(),
              triggered_by: "agent",
              agent_name: "sendgrid_engagement_agent",
            });
          }
          break;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      processed: events.length,
      bounced,
      delivered,
      opened,
      dropped,
    });
  } catch (err) {
    console.error("[sendgrid-webhook]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
