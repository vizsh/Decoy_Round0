# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User-pinned: React + Vite + TypeScript, Tailwind CSS, shadcn/ui (with the React Bits registry `@react-bits` → `https://reactbits.dev/r/{name}.json`), and motion.dev (`motion`). Detection engine runs in-browser in TypeScript for the first build (user decision), structured so a Python gateway (MCP proxy + AgentDojo evaluation) can replace it later without UI changes.

## Users

- **SOC analyst** (daily user): watches agent activity where every call is technically authorised; needs few alerts, each with a plain-language reason and an evidence chain verifiable in seconds.
- **CISO** (buyer): accountable for a fast-growing population of agent identities with little visibility; needs posture and an answer for the board.
- **Agent business owner** (e.g. head of procurement): must not have legitimate work broken; needs graduated containment, not a kill switch.
- **Hackathon judges** (first audience of this build): evaluate whether the system detects identity drift reliably, explains itself, and contains risk without disrupting work.

## Product Purpose

MANDATE detects when an autonomous AI agent stops behaving like the role it was created for, even though its credentials remain fully valid. It encodes each agent's declared role as a machine-checkable Mandate Card, learns observed normal behaviour, scores sessions as stories (taint → reach → leak) rather than isolated events, explains every alert as named risk factors, and applies the lowest-disruption control that contains the risk.

Success: a judge watches a hijacked procurement agent get caught and contained mid-attack while purchase orders keep flowing, and watches a legitimate deploy pass without an alarm.

## Positioning

Identity vendors manage **who** the agent is; runtime tools baseline **what it usually does**. MANDATE owns the missing middle layer: **what it was hired to do**. Distinct mechanisms: the signed Mandate Card checked with deterministic rules (no LLM in the decision path), receipt-aware change handling (Change Ledger), delegation passports whose authority can only shrink across hops, an anchored baseline with a cumulative drift budget against slow-drift evasion, and graduated containment including scope-down tokens and a decoy sandbox that turns containment into threat intelligence.

## Operating Context

- Sits beside existing infrastructure (IdP such as Okta/Entra, an MCP/API gateway, SIEM) rather than replacing it.
- Observed signals: tool/API calls and arguments, data sensitivity classes touched, egress destinations, sequence shape, volume/timing, input provenance (untrusted content entering context), delegation graph, change events (deploys, prompt versions, tool-definition hashes), client fingerprint.
- Demo environment: a simulated enterprise with 4–6 agents (procurement, HR, support, finance, plus an orchestrator) and scripted attack and benign scenarios.

## Capabilities and Constraints

- Five attack vectors to cover: indirect prompt injection, tool poisoning / rug pull, trusted tool with poisoned data, stolen token, agent-to-agent spread. Plus a non-malicious change source (deploys, prompt edits, new tools) that must not alarm.
- Response ladder: observe → require approval → scope down → sandbox with decoy data → revoke.
- Terminology: Mandate Card, Change Ledger (receipts), Herd lens, Self lens, Delegation passport, Drift budget, Honeytoken, Story Engine, Taint.
- Open: real evaluation numbers (AgentDojo) are not yet measured.

## Evidence on Hand

- Problem statement: `C:\Users\jeeve\Downloads\decoy_ps.pdf` ("Identity Drift Detection in Autonomous AI Agents").
- Ideation doc: "MANDATE: Identity Drift Detection for AI Agents" (claude.ai doc).
- Cited public industry figures (IBM 2025 breach report, SailPoint, Palo Alto, CyberArk, NIST NCCoE, OWASP Agentic Top 10) and incidents (EchoLeak, ForcedLeak, Salesloft Drift, GitHub MCP hijack, Prompt Infection research) — usable only with attribution.
- **Absent, must not be fabricated**: customers, testimonials, measured detection/false-positive rates, pricing commitments, benchmarks. All demo telemetry is synthetic and must be labelled as such; risk-score trajectories are produced by the in-browser engine, not claimed as measured results.

## Product Principles

1. Score stories, not events: the attack is only visible across steps, measured against what the agent is for.
2. Every number explains itself: a risk score is always a sum of named, human-verifiable factors.
3. Contain without breaking work: the lowest-disruption control that holds the risk wins.
4. Anchor to the mandate: adaptive baselines may move, but never outside the declared role.
5. Honest about limits: synthetic data is labelled, unmeasured claims are never presented as measured.

## Accessibility & Inclusion

WCAG 2.2 AA target: risk states never encoded by colour alone, reduced-motion respected, keyboard-operable console.
