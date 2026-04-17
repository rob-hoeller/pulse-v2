/**
 * Contact Matching & Deduplication Engine
 * 
 * When a new web form / inbound contact arrives, this module:
 * 1. Checks for exact email match → returns existing contact
 * 2. Checks for exact phone match → returns existing contact
 * 3. Checks for name match + same community → flags for review (possible duplicate)
 * 4. If no match → creates new contact
 * 
 * Any new email/phone found on an existing contact gets added as additional contact info.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InboundContact {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  source?: string;
  community_id?: string | null;
  division_id?: string | null;
  message?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
}

export type MatchResult =
  | { type: "exact_match"; contact_id: string; matched_on: "email" | "phone"; contact: Record<string, unknown> }
  | { type: "name_match_review"; contact_id: string; contact: Record<string, unknown>; reason: string }
  | { type: "new_contact"; contact_id: string; contact: Record<string, unknown> };

// ─── Normalize helpers ────────────────────────────────────────────────────────

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Strip everything except digits
  const digits = phone.replace(/\D/g, "");
  // Ensure E.164 format
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

// ─── Main matching function ───────────────────────────────────────────────────

export async function matchOrCreateContact(
  orgId: string,
  inbound: InboundContact
): Promise<MatchResult> {
  const email = normalizeEmail(inbound.email);
  const phone = normalizePhone(inbound.phone);
  const firstName = inbound.first_name.trim();
  const lastName = inbound.last_name.trim();

  // ── 1. Check email match (primary email, secondary email, or contact_members email)
  if (email) {
    // Check contacts table: email or email_secondary
    const { data: emailMatches } = await supabase
      .from("contacts")
      .select("*")
      .or(`email.eq.${email},email_secondary.eq.${email}`)
      .eq("org_id", orgId)
      .limit(5);

    if (emailMatches && emailMatches.length > 0) {
      const match = emailMatches[0];
      
      // If they submitted with a phone we don't have, add it
      if (phone && !match.phone && !match.phone_secondary) {
        await supabase.from("contacts").update({ phone: phone }).eq("id", match.id);
      } else if (phone && match.phone && match.phone !== phone && !match.phone_secondary) {
        await supabase.from("contacts").update({ phone_secondary: phone }).eq("id", match.id);
      }

      return { type: "exact_match", contact_id: match.id, matched_on: "email", contact: match };
    }

    // Also check contact_members for email match
    const { data: memberEmailMatches } = await supabase
      .from("contact_members")
      .select("contact_id, first_name, last_name, email")
      .eq("email", email)
      .limit(5);

    if (memberEmailMatches && memberEmailMatches.length > 0) {
      const membMatch = memberEmailMatches[0];
      const { data: parentContact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", membMatch.contact_id)
        .single();

      if (parentContact) {
        return { type: "exact_match", contact_id: parentContact.id, matched_on: "email", contact: parentContact };
      }
    }
  }

  // ── 2. Check phone match
  if (phone) {
    const { data: phoneMatches } = await supabase
      .from("contacts")
      .select("*")
      .or(`phone.eq.${phone},phone_secondary.eq.${phone}`)
      .eq("org_id", orgId)
      .limit(5);

    if (phoneMatches && phoneMatches.length > 0) {
      const match = phoneMatches[0];

      // If they submitted with an email we don't have, add it
      if (email && !match.email && !match.email_secondary) {
        await supabase.from("contacts").update({ email: email }).eq("id", match.id);
      } else if (email && match.email && match.email !== email && !match.email_secondary) {
        await supabase.from("contacts").update({ email_secondary: email }).eq("id", match.id);
      }

      return { type: "exact_match", contact_id: match.id, matched_on: "phone", contact: match };
    }

    // Check contact_members for phone match
    const { data: memberPhoneMatches } = await supabase
      .from("contact_members")
      .select("contact_id")
      .eq("phone", phone)
      .limit(5);

    if (memberPhoneMatches && memberPhoneMatches.length > 0) {
      const { data: parentContact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", memberPhoneMatches[0].contact_id)
        .single();

      if (parentContact) {
        return { type: "exact_match", contact_id: parentContact.id, matched_on: "phone", contact: parentContact };
      }
    }
  }

  // ── 3. Check name match (same first + last name)
  const { data: nameMatches } = await supabase
    .from("contacts")
    .select("*")
    .ilike("first_name", firstName)
    .ilike("last_name", lastName)
    .eq("org_id", orgId)
    .limit(10);

  if (nameMatches && nameMatches.length > 0) {
    // Check if any name match is in the same community
    for (const match of nameMatches) {
      if (inbound.community_id) {
        const { data: sameCommOpp } = await supabase
          .from("opportunities")
          .select("id")
          .eq("contact_id", match.id)
          .eq("community_id", inbound.community_id)
          .limit(1);

        if (sameCommOpp && sameCommOpp.length > 0) {
          // Same name + same community = very likely duplicate
          // Add the new email/phone to the existing contact
          if (email && match.email !== email && match.email_secondary !== email) {
            if (!match.email_secondary) {
              await supabase.from("contacts").update({ email_secondary: email }).eq("id", match.id);
            }
            // Also add as contact_member email if different person
            await addEmailToMembers(match.id, email);
          }

          return {
            type: "name_match_review",
            contact_id: match.id,
            contact: match,
            reason: `Existing contact "${match.first_name} ${match.last_name}" found in same community with email ${match.email}. New submission used email ${email ?? "none"}. Please verify — emails have been associated.`,
          };
        }
      }

      // Same name, different community — still flag if name is unusual
      // For common names (Smith, Johnson), this might be different people
      // For now, flag all name matches
      return {
        type: "name_match_review",
        contact_id: match.id,
        contact: match,
        reason: `Contact with same name "${firstName} ${lastName}" already exists (email: ${match.email}). New submission used email ${email ?? "none"}, phone ${phone ?? "none"}. Verify if this is the same person.`,
      };
    }
  }

  // ── 4. No match — create new contact
  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      org_id: orgId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      source: inbound.source ?? "website",
      lifecycle: "lead_com" as const,
    })
    .select()
    .single();

  if (error || !newContact) {
    throw new Error(`Failed to create contact: ${error?.message}`);
  }

  // Create primary member
  await supabase.from("contact_members").insert({
    contact_id: newContact.id,
    role: "primary",
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    is_primary: true,
  });

  return { type: "new_contact", contact_id: newContact.id, contact: newContact };
}

// ─── Helper: add email to contact members ─────────────────────────────────────

async function addEmailToMembers(contactId: string, email: string) {
  // Check if any member already has this email
  const { data: existing } = await supabase
    .from("contact_members")
    .select("id")
    .eq("contact_id", contactId)
    .eq("email", email)
    .limit(1);

  if (!existing || existing.length === 0) {
    // No member has this email — update the primary member's record or note it
    // For now, we just ensure the contact has it as email_secondary
    // The OSC can manually associate it to the right member
  }
}

// ─── Web Form Processor ───────────────────────────────────────────────────────

export async function processWebForm(
  orgId: string,
  form: InboundContact & { message?: string }
): Promise<{
  matchResult: MatchResult;
  opportunityId: string;
  activities: string[];
  flags: string[];
}> {
  const flags: string[] = [];
  const activityIds: string[] = [];

  // 1. Match or create contact
  const matchResult = await matchOrCreateContact(orgId, form);

  if (matchResult.type === "name_match_review") {
    flags.push(matchResult.reason);
  }

  if (matchResult.type === "exact_match") {
    flags.push(`Matched existing contact on ${matchResult.matched_on}: ${matchResult.matched_on === "email" ? form.email : form.phone}`);
  }

  const contactId = matchResult.contact_id;

  // 2. Check if they already have an opportunity at this community
  let opportunityId: string;

  if (form.community_id) {
    const { data: existingOpp } = await supabase
      .from("opportunities")
      .select("id, crm_stage")
      .eq("contact_id", contactId)
      .eq("community_id", form.community_id)
      .eq("is_active", true)
      .limit(1);

    if (existingOpp && existingOpp.length > 0) {
      // Already have an opportunity here — just record the activity
      opportunityId = existingOpp[0].id;
      
      // If they're in marketing/lead, auto-promote to queue (new inbound = OSC should look)
      if (["lead_div", "lead_com"].includes(existingOpp[0].crm_stage)) {
        await supabase
          .from("opportunities")
          .update({ 
            crm_stage: "queue",
            opportunity_source: "webform_interest",
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", opportunityId);

        flags.push(`Existing ${existingOpp[0].crm_stage} auto-promoted to queue (new web form activity)`);
      } else {
        // Update last activity timestamp
        await supabase
          .from("opportunities")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", opportunityId);
      }
    } else {
      // No opportunity at this community — create one in queue
      const { data: newOpp } = await supabase
        .from("opportunities")
        .insert({
          org_id: orgId,
          contact_id: contactId,
          crm_stage: "queue",
          division_id: form.division_id,
          community_id: form.community_id,
          source: form.source ?? "website",
          opportunity_source: "webform_interest",
          budget_min: form.budget_min,
          budget_max: form.budget_max,
          notes: form.message,
          last_activity_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      opportunityId = newOpp?.id ?? "";
    }
  } else {
    // No community specified — create/update at division level (marketing)
    const { data: existingMkt } = await supabase
      .from("opportunities")
      .select("id")
      .eq("contact_id", contactId)
      .eq("crm_stage", "lead_div")
      .eq("division_id", form.division_id ?? "")
      .limit(1);

    if (existingMkt && existingMkt.length > 0) {
      opportunityId = existingMkt[0].id;
      // Promote to queue since they're now actively reaching out
      await supabase
        .from("opportunities")
        .update({ 
          crm_stage: "queue",
          opportunity_source: "webform_interest",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", opportunityId);
      
      flags.push("Division lead auto-promoted to queue (submitted web form)");
    } else {
      const { data: newOpp } = await supabase
        .from("opportunities")
        .insert({
          org_id: orgId,
          contact_id: contactId,
          crm_stage: "queue",
          division_id: form.division_id,
          community_id: form.community_id,
          source: form.source ?? "website",
          opportunity_source: "webform_interest",
          notes: form.message,
          last_activity_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      opportunityId = newOpp?.id ?? "";
    }
  }

  // 3. Record the web form activity
  const { data: activity } = await supabase
    .from("activities")
    .insert({
      org_id: orgId,
      contact_id: contactId,
      opportunity_id: opportunityId,
      channel: "webform",
      direction: "inbound",
      type: "webform",
      subject: `Web form: ${form.message?.substring(0, 100) ?? "General inquiry"}`,
      body: form.message,
      community_id: form.community_id,
      division_id: form.division_id,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (activity) activityIds.push(activity.id);

  return {
    matchResult,
    opportunityId,
    activities: activityIds,
    flags,
  };
}
