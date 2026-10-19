export type AgentId = string;

export type DataClass =
  | "public"
  | "catalog"
  | "supplier"
  | "purchasing"
  | "customer"
  | "finance"
  | "hr"
  | "pii"
  | "credentials";

export const SENSITIVITY: Record<DataClass, number> = {
  public: 0,
  catalog: 0,
  supplier: 1,
  purchasing: 1,
  customer: 2,
  finance: 2,
  hr: 3,
  pii: 3,
  credentials: 4,
};

export type TemplateId =
  | "procurement"
  | "hr"
  | "support"
  | "finance"
  | "ledger"
  | "reporting"
  | "orchestrator";

export type EventKind = "ingest" | "read" | "list" | "write" | "egress" | "delegate" | "change";

export type Provenance = "trusted" | "untrusted";

export interface ClientFingerprint {
  userAgent: string;
  asn: string;
}

export type ChangeType = "deploy" | "prompt" | "tool_register" | "tool_update" | "mandate_amend";

export interface Receipt {
  id: string;
  ref: string;
  approvedBy: string;
}

export interface ChangeEvent {
  type: ChangeType;
  description: string;
  receipt?: Receipt;
  covers?: { tools?: string[]; hosts?: string[]; dataClasses?: DataClass[] };
  toolHash?: { tool: string; from: string; to: string };
}

export interface AgentEvent {
  id: string;
  seq: number;
  at: number;
  agent: AgentId;
  session: string;
  kind: EventKind;
  tool: string;
  summary: string;
  resource?: string;
  dataClass?: DataClass;
  records?: number;
  dest?: string;
  bytes?: number;
  payloadEntropy?: number;
  provenance?: Provenance;
  source?: string;
  delegateTo?: AgentId;
  requested?: DataClass[];
  change?: ChangeEvent;
  client?: ClientFingerprint;
  carries?: string[];
  parent?: string;
  day?: number;
}

export interface MandateCard {
  agent: AgentId;
  role: string;
  template: TemplateId;
  owner: string;
  purpose: string;
  version: number;
  signedBy: string;
  signedAt: string;
  tools: string[];
  dataClasses: DataClass[];
  destinations: string[];
  mayDelegateTo: AgentId[];
  actsForRequester?: boolean;
  limits: { maxRecordsPerRead: number; maxBytesOut: number };
}

export interface Agent {
  id: AgentId;
  name: string;
  template: TemplateId;
  owner: string;
  granted: string[];
  createdDaysAgo: number;
  client: ClientFingerprint;
}

export type Lens = "mandate" | "taint" | "self" | "herd" | "chain" | "drift" | "story";

export const LENSES: Lens[] = ["mandate", "taint", "self", "herd", "chain", "drift"];

export type Certainty = "observed" | "inferred";

export interface Factor {
  key: string;
  lens: Lens;
  label: string;
  detail: string;
  points: number;
  certainty: Certainty;
  evidence: string[];
  waivedBy?: string;
}

export type Rung = "observe" | "approval" | "scope" | "sandbox" | "revoke";

export const RUNGS: Rung[] = ["observe", "approval", "scope", "sandbox", "revoke"];

export const RUNG_FLOOR: Record<Rung, number> = {
  observe: 0,
  approval: 25,
  scope: 45,
  sandbox: 65,
  revoke: 85,
};

export type Decision =
  | "allowed"
  | "held"
  | "denied_scope"
  | "decoy_served"
  | "captured"
  | "denied_revoked";

export type StoryStage = "taint" | "reach" | "leak";

export interface Passport {
  origin: string;
  hops: AgentId[];
  tainted: boolean;
  taintSources: string[];
  authority: DataClass[];
}

export interface Assessment {
  event: AgentEvent;
  iam: "allow" | "deny";
  inMandate: boolean;
  violations: string[];
  risk: number;
  delta: number;
  channels: Record<Lens, number>;
  factors: Factor[];
  newFactors: string[];
  rung: Rung;
  recommended: Rung;
  decision: Decision;
  stages: StoryStage[];
  passport?: Passport;
  drift?: {
    dataClass: DataClass;
    value: number;
    zAnchored: number;
    zRolling: number;
    cusum: number;
    fill: number;
    exceeded: boolean;
  };
  note?: string;
}
