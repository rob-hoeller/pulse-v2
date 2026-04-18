# SPEC: API Integrations — Outlook Email + Zoom Phone/SMS

**Version:** 1.0  
**Date:** 2026-04-17  
**Author:** Schellie (AI Architect)  
**Status:** Ready for IT Setup  
**For:** Schell Brothers IT Team  

---

## Overview

Pv2 CRM needs to send and receive real emails, phone calls, and text messages through the Comm Hub. This requires API access to Microsoft Outlook (via Graph API) and Zoom (Phone + SMS).

---

## 1. Microsoft Outlook / Graph API

### What We Need
- Read inbound emails to CSM/OSC mailboxes
- Send outbound emails from CSM/OSC email addresses
- Mark emails as read
- Real-time webhooks when new email arrives

### Setup Steps

#### Step 1: Create Azure AD App Registration
1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
   - Name: `Pulse v2 CRM`
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `https://pulse-v2-nine.vercel.app/api/auth/callback/microsoft` (Web)
3. Note the **Application (client) ID** and **Directory (tenant) ID**

#### Step 2: Create Client Secret
1. In the app registration → Certificates & secrets
2. New client secret → Description: "Pulse v2" → Expiry: 24 months
3. **Copy the secret value immediately** (it won't be shown again)

#### Step 3: Add API Permissions
1. API permissions → Add a permission → Microsoft Graph
2. **Application permissions** (not delegated):
   - `Mail.Read` — Read mail in all mailboxes
   - `Mail.ReadWrite` — Read and write mail in all mailboxes
   - `Mail.Send` — Send mail as any user
   - `User.Read.All` — Read all users' profiles
3. Click "Grant admin consent for Schell Brothers"

#### Step 4: Configure Webhook Subscriptions
Pv2 will create Graph subscriptions for each CSM/OSC mailbox to receive real-time notifications when new emails arrive.

### Credentials Needed
| Credential | Where to Find |
|---|---|
| **Tenant ID** | Azure AD → App registrations → Overview |
| **Client ID** | Azure AD → App registrations → Overview |
| **Client Secret** | Azure AD → App registrations → Certificates & secrets |

### CSM/OSC Email Addresses
Please provide the email addresses for each team member who should have their inbox monitored:

| Name | Role | Email |
|---|---|---|
| Jamie Brooks | OSC | jamie.brooks@schellbrothers.com |
| Taylor Winn | OSC | taylor.winn@schellbrothers.com |
| Chris Avery | OSC | chris.avery@schellbrothers.com |
| Mike Patterson | CSM | mike.patterson@schellbrothers.com |
| Sarah Donovan | CSM | sarah.donovan@schellbrothers.com |
| Alex Mercer | CSM | alex.mercer@schellbrothers.com |
| Rachel Kim | CSM | rachel.kim@schellbrothers.com |
| Tom Bradley | CSM | tom.bradley@schellbrothers.com |

*(Update with actual email addresses)*

### Security Notes
- Application permissions allow Pv2 to access mailboxes without user sign-in
- Use [Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access) to restrict access to only the CSM/OSC mailboxes (not all org mailboxes)
- Client secret should be stored in Vercel environment variables (never in code)

---

## 2. Zoom Phone + SMS

### What We Need
- Call logs (inbound, outbound, missed calls, voicemails)
- Call recordings (if available)
- Send SMS from CSM/OSC Zoom phone numbers
- Receive inbound SMS via webhook
- Real-time webhooks for call events

### Setup Steps

#### Step 1: Create Zoom Server-to-Server OAuth App
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/) → Develop → Build App
2. Choose "Server-to-Server OAuth"
3. App name: `Pulse v2 CRM`
4. Note the **Account ID**, **Client ID**, and **Client Secret**

#### Step 2: Add Scopes
Add the following scopes to the app:

**Phone scopes:**
- `phone:read:admin` — Read call logs, recordings
- `phone:write:admin` — Update call handling
- `phone_call_log:read:admin` — Read call log data

**SMS scopes:**
- `phone:read:admin` — Read SMS messages
- `phone:write:admin` — Send SMS messages

**User scopes:**
- `user:read:admin` — Read user info (map users to phone numbers)

#### Step 3: Configure Event Subscriptions (Webhooks)
1. In the app settings → Feature → Event Subscriptions
2. Add subscription URL: `https://pulse-v2-nine.vercel.app/api/webhooks/zoom`
3. Subscribe to events:
   - `phone.callee_call_log_completed` — inbound call completed
   - `phone.caller_call_log_completed` — outbound call completed
   - `phone.callee_missed` — missed call
   - `phone.voicemail_received` — new voicemail
   - `phone.sms_received` — inbound SMS
   - `phone.sms_sent` — outbound SMS confirmation

#### Step 4: Activate the App
1. Review and activate the app
2. The app will be immediately active for the Zoom account

### Credentials Needed
| Credential | Where to Find |
|---|---|
| **Account ID** | Zoom Marketplace → App → App Credentials |
| **Client ID** | Zoom Marketplace → App → App Credentials |
| **Client Secret** | Zoom Marketplace → App → App Credentials |
| **Verification Token** | Zoom Marketplace → App → Feature → Event Subscriptions |

### CSM/OSC Zoom Phone Numbers
Please provide the Zoom phone number and Zoom user ID for each team member:

| Name | Role | Zoom Phone # | Zoom User ID/Email |
|---|---|---|---|
| Jamie Brooks | OSC | (302) xxx-xxxx | jamie.brooks@schellbrothers.com |
| Taylor Winn | OSC | (302) xxx-xxxx | taylor.winn@schellbrothers.com |
| Chris Avery | OSC | (302) xxx-xxxx | chris.avery@schellbrothers.com |
| Mike Patterson | CSM | (302) xxx-xxxx | mike.patterson@schellbrothers.com |
| Sarah Donovan | CSM | (302) xxx-xxxx | sarah.donovan@schellbrothers.com |
| (others...) | | | |

*(Update with actual phone numbers and Zoom accounts)*

### Security Notes
- Server-to-Server OAuth does not require user authorization — it acts on behalf of the account
- The verification token validates that webhook payloads actually come from Zoom
- Store all credentials in Vercel environment variables

---

## 3. What Pv2 Will Do With These APIs

### Email Flow
```
Inbound email → Graph webhook → Pv2 records activity → 
  appears in Comm Hub → AI drafts reply → 
  user clicks Send → Graph API sends email from their account →
  outbound activity recorded
```

### Phone Flow
```
Inbound call → Zoom webhook → Pv2 records activity →
  missed call appears as URGENT in Comm Hub →
  user clicks Call Back → initiates Zoom call →
  call log recorded as outbound activity
```

### SMS Flow
```
Inbound text → Zoom webhook → Pv2 records activity →
  appears in Comm Hub with NEEDS RESPONSE →
  user types reply → Zoom SMS API sends from their number →
  outbound activity recorded
```

---

## 4. Environment Variables (for Vercel)

Once credentials are obtained, add to Vercel project settings:

```
# Microsoft Graph
MICROSOFT_TENANT_ID=<tenant-id>
MICROSOFT_CLIENT_ID=<client-id>
MICROSOFT_CLIENT_SECRET=<client-secret>

# Zoom
ZOOM_ACCOUNT_ID=<account-id>
ZOOM_CLIENT_ID=<client-id>
ZOOM_CLIENT_SECRET=<client-secret>
ZOOM_VERIFICATION_TOKEN=<verification-token>
```

---

## 5. Timeline

| Phase | What | Dependencies |
|---|---|---|
| **Now** | IT creates Azure AD app + Zoom app | This document |
| **Next** | Pv2 builds webhook handlers | Credentials from IT |
| **Then** | Test with 1-2 CSM mailboxes/phones | Working webhooks |
| **Go Live** | Enable for all CSMs/OSCs | Successful testing |

---

*Document prepared by Schellie — April 17, 2026*  
*For: Schell Brothers IT Team*  
*Contact: Lance Manlove for questions*
