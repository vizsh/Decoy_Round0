import { between, fnv1a, mulberry32, weighted, type Rng } from "./prng";
import type { Agent, AgentEvent, AgentId, ClientFingerprint, DataClass, EventKind, MandateCard, Provenance, TemplateId } from "./types";

export const ORG = "Northwind Fabrication";

const RUNTIME: ClientFingerprint = { userAgent: "mandate-runtime/2.4 (agent-sdk)", asn: "AS64500 Northwind DC" };

export const AGENTS: Agent[] = [
  { id: "ORC-00", name: "Orchestrator", template: "orchestrator", owner: "Platform Engineering", granted: ["agents:invoke:*", "email:read", "http:post:*"], createdDaysAgo: 210, client: RUNTIME },
  { id: "PRC-01", name: "Procurement Agent", template: "procurement", owner: "Head of Procurement", granted: ["fs:read:/**", "http:post:*", "erp:*", "email:read", "suppliers:*"], createdDaysAgo: 164, client: RUNTIME },
  { id: "HRA-02", name: "HR Onboarding Agent", template: "hr", owner: "HR Operations Lead", granted: ["fs:read:/hr/**", "hr:*", "email:*", "http:post:*.internal"], createdDaysAgo: 131, client: RUNTIME },
  { id: "SUP-03", name: "Support Inbox Agent", template: "support", owner: "Customer Support Manager", granted: ["crm:*", "email:*", "kb:*", "tickets:*", "agents:invoke:*", "http:post:*"], createdDaysAgo: 98, client: RUNTIME },
  { id: "FIN-04", name: "Finance Reconciliation Agent", template: "finance", owner: "Financial Controller", granted: ["ledger:*", "bank:*", "invoices:*", "fs:read:/finance/**", "http:post:*", "agents:invoke:*"], createdDaysAgo: 187, client: RUNTIME },
  { id: "RPT-05", name: "Reporting Agent", template: "reporting", owner: "Financial Controller", granted: ["report:*", "files:*", "http:post:*"], createdDaysAgo: 72, client: RUNTIME },
  { id: "LDB-06", name: "Ledger DB Agent", template: "ledger", owner: "Data Platform", granted: ["db:*", "agents:invoke:*"], createdDaysAgo: 143, client: RUNTIME },
  { id: "PRC-07", name: "Procurement Agent (EU)", template: "procurement", owner: "Head of Procurement", granted: ["fs:read:/**", "http:post:*", "erp:*", "email:read", "suppliers:*"], createdDaysAgo: 0, client: RUNTIME },
];

export const agentById = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

const MANDATE_BASE: Record<TemplateId, Omit<MandateCard, "agent" | "owner" | "version" | "signedBy" | "signedAt">> = {
  orchestrator: {
    role: "Orchestrator",
    template: "orchestrator",
    purpose: "Route employee requests to the right specialist agent and return their answers.",
    tools: ["agents.invoke", "email.read", "chat.reply"],
    dataClasses: ["public"],
    destinations: ["mail.northwind.internal", "chat.northwind.internal"],
    mayDelegateTo: ["PRC-01", "HRA-02", "SUP-03", "FIN-04", "RPT-05"],
    actsForRequester: true,
    limits: { maxRecordsPerRead: 50, maxBytesOut: 20_000 },
  },
  procurement: {
    role: "Procurement Agent",
    template: "procurement",
    purpose: "Check supplier prices, compare quotes, and raise purchase requests within budget.",
    tools: ["suppliers.get_prices", "suppliers.submit_rfq", "erp.create_purchase_request", "erp.get_budget", "fs.list", "fs.read", "email.read"],
    dataClasses: ["public", "catalog", "supplier", "purchasing"],
    destinations: ["api.suppliers.example", "erp.northwind.internal", "mail.northwind.internal", "files.northwind-share.example"],
    mayDelegateTo: [],
    limits: { maxRecordsPerRead: 400, maxBytesOut: 40_000 },
  },
  hr: {
    role: "HR Onboarding Agent",
    template: "hr",
    purpose: "Prepare onboarding packs and update new-hire records.",
    tools: ["hr.get_employee", "hr.update_onboarding", "fs.read", "email.send"],
    dataClasses: ["hr", "pii", "public"],
    destinations: ["hr.northwind.internal", "mail.northwind.internal"],
    mayDelegateTo: [],
    limits: { maxRecordsPerRead: 60, maxBytesOut: 30_000 },
  },
  support: {
    role: "Support Inbox Agent",
    template: "support",
    purpose: "Answer customer emails using the knowledge base and the customer's own CRM record.",
    tools: ["email.read", "crm.lookup_customer", "kb.search", "tickets.reply"],
    dataClasses: ["public", "customer"],
    destinations: ["mail.northwind.internal", "crm.northwind.internal"],
    mayDelegateTo: [],
    limits: { maxRecordsPerRead: 5, maxBytesOut: 15_000 },
  },
  finance: {
    role: "Finance Reconciliation Agent",
    template: "finance",
    purpose: "Match invoices to ledger entries and flag discrepancies for the controller.",
    tools: ["ledger.query", "invoices.match", "bank.get_statement", "fs.read", "agents.invoke"],
    dataClasses: ["finance", "purchasing"],
    destinations: ["erp.northwind.internal", "bank-api.example"],
    mayDelegateTo: ["LDB-06", "RPT-05"],
    limits: { maxRecordsPerRead: 2_000, maxBytesOut: 25_000 },
  },
  reporting: {
    role: "Reporting Agent",
    template: "reporting",
    purpose: "Render finance reports and publish them to the internal share.",
    tools: ["report.render", "files.upload"],
    dataClasses: ["finance", "public"],
    destinations: ["files.northwind-share.example"],
    mayDelegateTo: [],
    limits: { maxRecordsPerRead: 5_000, maxBytesOut: 2_000_000 },
  },
  ledger: {
    role: "Ledger DB Agent",
    template: "ledger",
    purpose: "Answer read-only ledger queries for authorised finance agents.",
    tools: ["db.query", "agents.invoke"],
    dataClasses: ["finance"],
    destinations: ["erp.northwind.internal"],
    mayDelegateTo: ["RPT-05"],
    limits: { maxRecordsPerRead: 5_000, maxBytesOut: 5_000 },
  },
};

export function signMandate(card: Omit<MandateCard, "signedAt"> & { signedAt?: string }): MandateCard & { fingerprint: string } {
  const full: MandateCard = { ...card, signedAt: card.signedAt ?? "2026-05-02" };
  const { signedAt: _s, ...hashed } = full;
  return { ...full, fingerprint: fnv1a(JSON.stringify(hashed)) };
}

export type SignedMandate = MandateCard & { fingerprint: string };

export function baseMandates(): Record<AgentId, SignedMandate> {
  const out: Record<AgentId, SignedMandate> = {};
  for (const a of AGENTS) {
    const base = MANDATE_BASE[a.template];
    out[a.id] = signMandate({
      ...base,
      agent: a.id,
      owner: a.owner,
      version: a.createdDaysAgo === 0 ? 1 : 4,
      signedBy: a.owner,
      signedAt: a.createdDaysAgo === 0 ? "2026-10-19" : "2026-05-02",
    });
  }
  return out;
}

export const TEMPLATE_UNIVERSE: Record<TemplateId, DataClass[]> = {
  orchestrator: ["public"],
  procurement: ["public", "catalog", "supplier", "purchasing", "finance"],
  hr: ["hr", "pii", "public"],
  support: ["public", "customer"],
  finance: ["finance", "purchasing", "supplier"],
  reporting: ["finance", "public"],
  ledger: ["finance"],
};

interface ActionTemplate {
  kind: EventKind;
  tool: string;
  dataClass?: DataClass;
  resource?: string;
  dest?: string;
  records?: [number, number];
  bytes?: [number, number];
  provenance?: [Provenance, number][];
  source?: string;
  delegateTo?: AgentId;
}

const PROFILES: Record<TemplateId, [ActionTemplate, number][]> = {
  procurement: [
    [{ kind: "read", tool: "suppliers.get_prices", dataClass: "catalog", dest: "api.suppliers.example", records: [20, 140] }, 0.3],
    [{ kind: "write", tool: "erp.create_purchase_request", dataClass: "purchasing", dest: "erp.northwind.internal", records: [1, 1] }, 0.18],
    [{ kind: "read", tool: "erp.get_budget", dataClass: "purchasing", dest: "erp.northwind.internal", records: [1, 12] }, 0.1],
    [{ kind: "list", tool: "fs.list", dataClass: "supplier", resource: "/procurement/quotes/" }, 0.08],
    [{ kind: "read", tool: "fs.read", dataClass: "supplier", resource: "/procurement/quotes/", records: [1, 30] }, 0.12],
    [{ kind: "ingest", tool: "email.read", source: "supplier email", provenance: [["untrusted", 0.45], ["trusted", 0.55]] }, 0.14],
    [{ kind: "egress", tool: "suppliers.submit_rfq", dest: "api.suppliers.example", bytes: [800, 6_000] }, 0.08],
  ],
  hr: [
    [{ kind: "read", tool: "hr.get_employee", dataClass: "hr", dest: "hr.northwind.internal", records: [1, 8] }, 0.35],
    [{ kind: "write", tool: "hr.update_onboarding", dataClass: "hr", dest: "hr.northwind.internal", records: [1, 1] }, 0.2],
    [{ kind: "read", tool: "fs.read", dataClass: "pii", resource: "/hr/onboarding/", records: [1, 4] }, 0.2],
    [{ kind: "egress", tool: "email.send", dest: "mail.northwind.internal", bytes: [1_000, 9_000] }, 0.15],
    [{ kind: "ingest", tool: "email.read", source: "internal email", provenance: [["trusted", 0.9], ["untrusted", 0.1]] }, 0.1],
  ],
  support: [
    [{ kind: "ingest", tool: "email.read", source: "customer email", provenance: [["untrusted", 0.85], ["trusted", 0.15]] }, 0.3],
    [{ kind: "read", tool: "crm.lookup_customer", dataClass: "customer", dest: "crm.northwind.internal", records: [1, 2] }, 0.3],
    [{ kind: "read", tool: "kb.search", dataClass: "public", records: [3, 10] }, 0.2],
    [{ kind: "egress", tool: "tickets.reply", dest: "mail.northwind.internal", bytes: [600, 4_000] }, 0.2],
  ],
  finance: [
    [{ kind: "read", tool: "ledger.query", dataClass: "finance", dest: "erp.northwind.internal", records: [30, 60] }, 0.35],
    [{ kind: "write", tool: "invoices.match", dataClass: "finance", dest: "erp.northwind.internal", records: [1, 20] }, 0.3],
    [{ kind: "read", tool: "bank.get_statement", dataClass: "finance", dest: "bank-api.example", records: [20, 120] }, 0.2],
    [{ kind: "delegate", tool: "agents.invoke", delegateTo: "RPT-05" }, 0.15],
  ],
  reporting: [
    [{ kind: "read", tool: "report.render", dataClass: "finance", records: [100, 900] }, 0.6],
    [{ kind: "egress", tool: "files.upload", dest: "files.northwind-share.example", bytes: [40_000, 400_000] }, 0.4],
  ],
  ledger: [[{ kind: "read", tool: "db.query", dataClass: "finance", dest: "erp.northwind.internal", records: [10, 900] }, 1]],
  orchestrator: [
    [{ kind: "ingest", tool: "email.read", source: "employee request", provenance: [["trusted", 0.8], ["untrusted", 0.2]] }, 0.4],
    [{ kind: "delegate", tool: "agents.invoke", delegateTo: "PRC-01" }, 0.2],
    [{ kind: "delegate", tool: "agents.invoke", delegateTo: "SUP-03" }, 0.2],
    [{ kind: "egress", tool: "chat.reply", dest: "chat.northwind.internal", bytes: [200, 2_000] }, 0.2],
  ],
};

export function generateSession(rng: Rng, agent: AgentId, template: TemplateId, session: string, client: ClientFingerprint): AgentEvent[] {
  const len = between(rng, 5, 11);
  const events: AgentEvent[] = [];
  for (let i = 0; i < len; i++) {
    const t = weighted(rng, PROFILES[template]);
    const ev: AgentEvent = {
      id: `${session}-${i}`,
      seq: i,
      at: i * 4000,
      agent,
      session,
      kind: t.kind,
      tool: t.tool,
      summary: t.tool,
      dataClass: t.dataClass,
      resource: t.resource,
      dest: t.dest,
      source: t.source,
      delegateTo: t.delegateTo,
      client,
    };
    if (t.records) ev.records = between(rng, t.records[0], t.records[1]);
    if (t.bytes) ev.bytes = between(rng, t.bytes[0], t.bytes[1]);
    if (t.provenance) ev.provenance = weighted(rng, t.provenance);
    if (t.kind === "delegate" && t.delegateTo) {
      const external = events.some((e) => e.provenance === "untrusted");
      const callee = MANDATE_BASE[agentById(t.delegateTo).template].dataClasses;
      ev.requested =
        MANDATE_BASE[template].actsForRequester
          ? external
            ? ["public"]
            : callee
          : callee.filter((c) => MANDATE_BASE[template].dataClasses.includes(c));
    }
    events.push(ev);
  }
  return events;
}

export interface History {
  sessions: AgentEvent[][];
}

export function agentHistory(agent: Agent, seed = 7): History {
  if (agent.createdDaysAgo === 0) return { sessions: [] };
  const rng = mulberry32(seed * 1009 + agent.id.charCodeAt(0) * 31 + agent.id.charCodeAt(4));
  const n = Math.min(160, agent.createdDaysAgo);
  const sessions: AgentEvent[][] = [];
  for (let i = 0; i < n; i++) sessions.push(generateSession(rng, agent.id, agent.template, `${agent.id}-h${i}`, agent.client));
  return { sessions };
}

export const HERD_SIZE: Record<TemplateId, number> = {
  procurement: 41,
  hr: 18,
  support: 33,
  finance: 22,
  reporting: 15,
  ledger: 9,
  orchestrator: 6,
};

export function herdHistory(template: TemplateId, seed = 11): { agents: number; sessions: AgentEvent[][] } {
  const rng = mulberry32(seed * 7919 + template.length * 104729);
  const agents = HERD_SIZE[template];
  const sessions: AgentEvent[][] = [];
  for (let a = 0; a < agents; a++) {
    for (let s = 0; s < 40; s++) sessions.push(generateSession(rng, `peer-${a}`, template, `peer-${a}-${s}`, RUNTIME));
  }
  return { agents, sessions };
}

export interface Honeytoken {
  id: string;
  resource: string;
  dataClass: DataClass;
  note: string;
}

export const HONEYTOKENS: Honeytoken[] = [
  { id: "HT-7731", resource: "/hr/salary_master_2026.xlsx", dataClass: "hr", note: "Decoy payroll workbook; no legitimate workflow references it." },
  { id: "HT-2208", resource: "/finance/vault/aws_root_keys.txt", dataClass: "credentials", note: "Decoy credential file seeded with canary keys." },
  { id: "HT-5150", resource: "crm://customers/export_all", dataClass: "customer", note: "Decoy bulk-export endpoint; real exports use the reporting pipeline." },
];

export const honeytokenFor = (resource?: string) => (resource ? HONEYTOKENS.find((h) => h.resource === resource) : undefined);
