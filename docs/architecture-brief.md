# Pv2 / HBx AI Factory — OpenClaw Architecture Brief
*Updated: 2026-03-18 — Revised with NVIDIA NemoClaw GTC 2026 reference architecture + agent security tier model*

## Purpose

This brief is intended for the OpenClaw/NemoClaw agent system to digest the high-level planning, architecture, and execution strategy for **Pulse v2 (Pv2)** as the first operating proof of the broader **HBx platform**.

---

## 1. Core Vision

Pv2 is **not just an app rewrite**.

Pv2 is:

* the new **pre-sale platform** for Schell Brothers,
* the first real application built on the **HBx AI platform**,
* and the first live test of the **AI Code Factory**.

The long-term goal is to build **"Foundry for homebuilding"**:

* a shared builder ontology,
* connected data,
* operational apps,
* governed AI agents,
* and a mission control layer that can eventually support multiple builders.

Pv2 is the first proof that this model works in production.

---

## 2. Strategic Objective of the Pv2 POC

Build a secure, local-first AI factory on **OpenClaw + NemoClaw** that can:

1. analyze Pv1 code and database structure,
2. design and build Pv2 faster than a traditional workflow,
3. connect Pv2 to **HB1** as the live pre-sale platform,
4. keep most inference local,
5. and establish the deployment pattern for full **HBx production**.

---

## 3. End-State Product Concept

Pv2 will become the **real pre-sale front end** while **HB1** remains the current operational backbone during transition.

### Pv2 responsibilities
* lead and prospect lifecycle management
* engagement tracking
* sales intelligence
* tasking and workflow automation
* AI summaries / insights / recommendations
* modern UI / dashboards / workflow orchestration

### HB1 responsibilities during transition
* downstream operational system of record for legacy workflows
* existing community / lot / buyer / pricing relationships
* operational milestones and handoff dependencies

### Integration intent
Pv2 should plug into HB1 so that Pv2 can be used by real teams as the front-end operating layer for pre-sale activity without requiring an immediate full HB1 replacement.

---

## 4. Reference Plane Architecture for the Pv2 POC

### Plane A — Product Plane
Human-facing application layer.
- Pv2 frontend, internal dashboards, admin screens, APIs used by the UI
- Pilot: lightweight app deployment
- Production: Vercel and/or AWS

### Plane B — Data Plane
Durable truth and operating memory.
- Supabase Postgres + platform services
- leads, prospects, activities, tasks, engagement events, AI summaries, user/org metadata, run logs and approvals
- **Multi-tenancy model:** Schell divisions share one Supabase project (RLS enforces isolation). External builder partners each get their own dedicated Supabase project. HBx app layer handles connection routing based on authenticated org.

### Plane C — Agent Control Plane (Mission Control)
- **Schellie (host OpenClaw)** — orchestration, task routing, human interface, approval gates. Runs on Mac Mini *outside* OpenShell sandbox by design. See Section 7 for security model.
- **NemoClaw** — NVIDIA's reference orchestration layer per GTC 2026. Coordinates sub-agents, memory, tools, multi-modal input, and inference routing.
- agent registry, model routing, tool permissions, run management
- evaluation and approval checkpoints
- Current/Pilot host: Mac Mini

### Plane D — Inference / Execution Plane
- Local inference via **Nemotron** (served via NIM containers, managed by Dynamo)
- Code generation, schema analysis, reasoning, QA, embeddings
- **AI-Q** — NVIDIA's enterprise agentic data pipeline for governed access to structured + unstructured HBx data
- Pilot: DGX Spark (incoming)
- Pre-Spark: NVIDIA cloud API via `inference.local` abstraction (zero code changes on Spark arrival)

### Plane E — External Premium Model Plane
- Selective escalation only
- Claude for hardest architecture/synthesis/debugging tasks
- Policy-gated, not default. Sanitized inputs — no raw proprietary data in escalations.

---

## 5. Current Infrastructure State

### Already in place
* OpenClaw on Mac Mini (Schellie — Mission Control)
* Docker environment established
* NVIDIA OpenShell / Nemo sandbox running (v0.0.7)
* SSH access to Nemo confirmed

### Incoming
* DGX Spark on order — dedicated local inference engine (Nemotron 3 Super via NIM)

### Pending (tomorrow — 2026-03-19)
* Supabase project + service role key (Lance creating)
* Vercel project + API token (Lance creating)
* GitHub repo access (Lance creating)

### Security posture
* Proprietary code, DB credentials, and buyer data stay inside fenced environment
* Claude escalation only with sanitized, structured inputs — never raw data
* OpenShell kernel-level enforcement on all execution agents (Landlock LSM + seccomp)

---

## 6. Agent Security Tier Model

This is one of the most important architectural decisions in the system. Agents operate in one of two security tiers:

### Tier 1 — Mission Control (Outside OpenShell)
**Who:** Schellie (host OpenClaw agent)
**Where:** Mac Mini host process, not sandboxed
**Why outside:** Schellie's job is to *manage* sandboxes — orchestrate tasks, route to agents, hold master credentials, interface with Lance, make approval decisions. Sandboxing the orchestrator defeats the purpose.
**Security:** Trusted by design (same as a senior engineer on the network). Human-in-the-loop approval gates for consequential actions. Claude API calls use sanitized inputs only.

### Tier 2 — Execution Sandbox (Inside OpenShell)
**Who:** Nemo + all task-execution agents (Discovery, Schema, Code Builder, QA, etc.)
**Where:** OpenShell sandbox pods (k3s), kernel-level policy enforcement
**Why inside:** Any agent touching code, data, external APIs, or proprietary information must be sandboxed. Policy enforcement is out-of-process — the agent cannot override it, bypass it, or prompt-inject around it.
**Security:** Landlock LSM + seccomp (kernel-level). Network policies YAML-declared, hot-reloadable. Each agent sandbox reaches only what its policy explicitly allows. `inference.local` for all LLM calls — never direct external AI endpoints.

### The clean rule
```
Orchestration + human interface  →  Tier 1 (Mission Control, outside)
Execution + data access          →  Tier 2 (OpenShell sandbox, inside)
```

This maps directly to Jensen Huang's GTC 2026 NemoClaw reference diagram:
NemoClaw in the center = orchestrator (Tier 1). OpenShell at the bottom = execution sandbox (Tier 2).

---

## 7. NVIDIA Stack Mapping (GTC 2026 Reference Architecture)

HBx implements NVIDIA's canonical reference architecture for enterprise specialized agents:

| NVIDIA Component | Role in HBx |
|---|---|
| **NemoClaw** | Orchestration layer — coordinates sub-agents, memory, tools, multi-modal input |
| **OpenShell** | Security sandbox — kernel-level policy enforcement for all execution agents |
| **Nemotron (via NIM)** | Local LLM — all agent inference routes here via `inference.local` |
| **NIM** | Pre-packaged optimized model containers — enables OTA model updates at fleet scale |
| **Dynamo** | High-throughput inference serving layer — scales across agents and concurrent tasks |
| **AI-Q** | Enterprise agentic data pipeline — governed access to Supabase, docs, HB1 data |
| **cuVS** | GPU-accelerated vector search — semantic search over leads, docs, codebase |
| **MCP (Tools)** | Model Context Protocol — standard interface for Supabase, GitHub, HB1 tool integrations |
| **cuOPT** | GPU-accelerated optimization — future: construction scheduling, trade routing |

**Position:** HBx is not building a custom AI stack. It is implementing NVIDIA's reference architecture for specialized enterprise agents, applied to homebuilding. This is the pattern Jensen put on stage at GTC 2026.

---

## 8. Recommended Initial Agent Stack

All execution agents run in Tier 2 (OpenShell sandbox). Schellie orchestrates from Tier 1.

1. **Orchestrator (Schellie)** — Tier 1. Project decomposition, task routing, dependency tracking, escalation, approval requests.
2. **Pv1 Discovery Agent** — Tier 2. Codebase inventory, module mapping, dependency graph, dead code / high-risk areas. *Requires Spark for secure Pv1 access.*
3. **Schema Migration Agent** — Tier 2. Pv1 DB inspection, Pv2 canonical schema proposal, table/field lineage, migration sequence.
4. **Business Logic Extraction Agent** — Tier 2. Lifecycle rules, stage transitions, engagement rules, hidden business assumptions.
5. **Pv2 Code Builder Agent** — Tier 2. Service scaffolds, APIs, UI components, DB migrations, tests.
6. **QA / Parity Agent** — Tier 2. Compare Pv1 vs Pv2 behavior, detect mismatches, regression analysis, confidence scoring.
7. **AI Feature Agent** — Tier 2. Net-new intelligence layers: summaries, next-best-action, prioritization signals.

---

## 9. POC Execution Sequence

- **Phase 0** — Secure Foundation: stabilize environment, confirm tool/repo/DB access model, define logging, define human approval gates *(~80% complete — pending Supabase/Vercel/GitHub credentials)*
- **Phase 1** — Pv1 Discovery: inventory modules, inspect DB schema, identify integrations, map lead/prospect workflows, risk register *(pending Spark arrival for secure code access)*
- **Phase 2** — Canonical Pv2 Design: domain objects, Pv1→Pv2 ontology mapping, service boundaries, event model, HB1 integration contracts
- **Phase 3** — First Working Vertical Slice: lead/prospect records, activity timeline, stage transitions, tasks, basic AI summary panel
- **Phase 4** — HB1 Integration: connect Pv2 to HB1 read/update flows, live pre-sale operations
- **Phase 5** — AI Intelligence Layer: lead summary, buying signal detection, recommended next action, follow-up prioritization

---

## 10. Model Routing Strategy

**Local-first (Nemotron via NIM on DGX Spark):** code analysis, schema translation, CRUD/service generation, docs, tests, repetitive reasoning, parity analysis, data extraction, embeddings, vector search

**Claude only when justified:** difficult architecture calls, edge-case debugging, very high-end synthesis, hard migration disputes, stuck tasks with low local confidence. Always sanitized inputs — no raw proprietary data.

**Pre-Spark:** NVIDIA cloud API via `inference.local` abstraction. Zero code changes in any agent when Spark arrives — Schellie runs two commands and all inference routes locally.

---

## 11. Multi-Tenancy Data Model

| Tenant Type | Supabase Model | Rationale |
|---|---|---|
| Schell divisions (Rehoboth, Richmond, Nashville, Boise) | Shared project, RLS on `org_id` | Same company, same trust boundary, cross-division analytics trivial |
| External builder partners | Separate Supabase project per partner | Legal isolation, data sovereignty, compliance, clean billing passthrough |

HBx app layer routes to the correct Supabase connection string based on authenticated org. New builder partner onboarding = automated project provisioning via Supabase Management API.

---

## 12. POC → Production Shape

| Plane | POC/Beta | Production |
|---|---|---|
| Product | Lightweight beta | Vercel + AWS |
| Data | Supabase (shared + per-partner) | Supabase + managed services |
| Agent Control | Mac Mini | Hardened private/cloud mission control |
| Inference | DGX Spark + Nemotron via NIM | Private NVIDIA infrastructure (multi-Spark or Thor) |
| Premium Model | Claude escalation | Claude via policy-gated routing |

**Key concept: the architecture survives; the hosting matures.**

---

## 13. Final Principle

**Pv2 is the first product. The real product is the factory that builds the next ten.**

Reusable outputs: agent definitions, routing patterns, tool permissions, migration workflows, QA/evaluation workflows, ontology patterns, mission control practices.

Future HBx modules: Construction, Selections, Warranty, Procurement, Finance, builder onboarding for other companies.

---

*Original brief: 2026-03-17. Author: Rob Hoeller.*
*Revised: 2026-03-18. Updated with NVIDIA GTC 2026 NemoClaw reference architecture, agent security tier model, multi-tenancy data model, AI-Q / NIM / Dynamo / MCP stack mapping.*
