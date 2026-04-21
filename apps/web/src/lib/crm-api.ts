/**
 * CRM API Client — UI calls this, which calls /api/crm, which calls Supabase.
 * 
 * This is the ONLY way the UI should execute CRM actions.
 * No direct Supabase calls for mutations.
 * 
 * Same API is callable by agents.
 */

interface ActionContext {
  triggered_by?: "human" | "agent";
  agent_name?: string;
  confidence_score?: number;
  reasoning?: string;
  user_id?: string;
}

interface CrmResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

async function callCrm(
  action: string,
  params: Record<string, unknown>,
  context?: ActionContext
): Promise<CrmResult> {
  const res = await fetch("/api/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      params,
      context: {
        triggered_by: context?.triggered_by ?? "human",
        ...context,
      },
    }),
  });
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

export async function evaluateQueueItem(opportunityId: string, ctx?: ActionContext) {
  return callCrm("evaluate_queue_item", { opportunity_id: opportunityId }, ctx);
}

export async function assignOpportunity(
  opportunityId: string,
  newStage: string,
  communityId: string | null,
  reason: string,
  ctx?: ActionContext
) {
  return callCrm("assign_opportunity", {
    opportunity_id: opportunityId,
    new_stage: newStage,
    community_id: communityId,
    reason,
  }, ctx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNICATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendEmail(
  contactId: string,
  opportunityId: string | null,
  subject: string,
  body: string,
  ctx?: ActionContext
) {
  return callCrm("send_email", {
    contact_id: contactId,
    opportunity_id: opportunityId,
    subject,
    body,
  }, ctx);
}

export async function sendSms(
  contactId: string,
  opportunityId: string | null,
  body: string,
  ctx?: ActionContext
) {
  return callCrm("send_sms", {
    contact_id: contactId,
    opportunity_id: opportunityId,
    body,
  }, ctx);
}

export async function generateResponse(opportunityId: string, ctx?: ActionContext) {
  return callCrm("generate_response", { opportunity_id: opportunityId }, ctx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function promoteOpportunity(
  opportunityId: string,
  newStage: string,
  reason: string,
  ctx?: ActionContext
) {
  return callCrm("promote_opportunity", {
    opportunity_id: opportunityId,
    new_stage: newStage,
    reason,
  }, ctx);
}

export async function demoteOpportunity(
  opportunityId: string,
  newStage: string,
  reason: string,
  ctx?: ActionContext
) {
  return callCrm("demote_opportunity", {
    opportunity_id: opportunityId,
    new_stage: newStage,
    reason,
  }, ctx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateContact(
  contactId: string,
  updates: Record<string, unknown>,
  ctx?: ActionContext
) {
  return callCrm("update_contact", {
    contact_id: contactId,
    updates,
  }, ctx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════════

export async function markRead(activityId: string, ctx?: ActionContext) {
  return callCrm("mark_read", { activity_id: activityId }, ctx);
}
