import type { Assessment, Decision, Lens, Rung } from "@/engine/types";

export type LaneKey = Exclude<Lens, "story"> | "risk";

export interface LaneMeta {
  key: LaneKey;
  label: string;
  ink: string;
  question: string;
  weight: number;
  max: number;
}

export const LANES: LaneMeta[] = [
  { key: "mandate", label: "Mandate", ink: "var(--color-ink-black)", question: "Is this inside the signed job description?", weight: 1, max: 1 },
  { key: "taint", label: "Taint", ink: "var(--color-ink-amber)", question: "Did untrusted content enter the context first?", weight: 1, max: 1 },
  { key: "self", label: "Self", ink: "var(--color-ink-blue)", question: "Is this unlike the agent's own history?", weight: 1, max: 1 },
  { key: "herd", label: "Herd", ink: "var(--color-ink-violet)", question: "Is this unlike its peers in the same role?", weight: 1, max: 1 },
  { key: "chain", label: "Chain", ink: "var(--color-ink-green)", question: "Is authority growing across a delegation hop?", weight: 1, max: 1 },
  { key: "drift", label: "Drift", ink: "var(--color-ink-graphite)", question: "Has slow change spent the drift budget?", weight: 1, max: 1.25 },
  { key: "risk", label: "Risk", ink: "var(--color-ink-red)", question: "The sum of named factors, 0 to 100.", weight: 2.7, max: 1 },
];

export const LENS_INK: Record<Lens, string> = {
  mandate: "var(--color-ink-black)",
  taint: "var(--color-ink-amber)",
  self: "var(--color-ink-blue)",
  herd: "var(--color-ink-violet)",
  chain: "var(--color-ink-green)",
  drift: "var(--color-ink-graphite)",
  story: "var(--color-ink-red)",
};

export const LENS_LABEL: Record<Lens, string> = {
  mandate: "Mandate",
  taint: "Taint",
  self: "Self",
  herd: "Herd",
  chain: "Chain",
  drift: "Drift",
  story: "Story",
};

export const laneValue = (s: Assessment | undefined, key: LaneKey) => (!s ? 0 : key === "risk" ? s.risk / 100 : s.channels[key]);

export const RUNG_LABEL: Record<Rung, string> = {
  observe: "Observe",
  approval: "Require approval",
  scope: "Scope down",
  sandbox: "Sandbox",
  revoke: "Revoke",
};

export const RUNG_DOES: Record<Rung, string> = {
  observe: "Log and keep watching. Nothing changes for the agent.",
  approval: "Anything off the Mandate Card waits for the owner's one-click approval.",
  scope: "A fresh short-lived token, limited to the Mandate Card. Off-mandate calls are refused; the job keeps running.",
  sandbox: "Off-mandate reads get decoy rows with canaries; outbound transfers are sinkholed and recorded.",
  revoke: "Token revoked and sessions closed. Needs a human hand on the switch.",
};

export const DECISION_LABEL: Record<Decision, string> = {
  allowed: "Allowed",
  held: "Held for owner",
  denied_scope: "Refused · scope",
  decoy_served: "Decoy served",
  captured: "Captured",
  denied_revoked: "Revoked",
};

export const DECISION_STAMP: Partial<Record<Decision, string>> = {
  held: "Held",
  denied_scope: "Scoped down",
  decoy_served: "Decoy served",
  captured: "Captured",
  denied_revoked: "Revoked",
};
