import { buildBaseline, DRIFT_H, DriftTracker, type Baseline } from "./baseline";
import { AGENTS, agentById, agentHistory, baseMandates, herdHistory, HERD_SIZE, honeytokenFor, signMandate, TEMPLATE_UNIVERSE, type SignedMandate } from "./world";
import {
  RUNG_FLOOR,
  RUNGS,
  SENSITIVITY,
  type Agent,
  type AgentEvent,
  type AgentId,
  type Assessment,
  type Decision,
  type Factor,
  type Lens,
  type MandateCard,
  type Passport,
  type Receipt,
  type Rung,
  type StoryStage,
  type TemplateId,
} from "./types";

export interface EngineConfig {
  autoContainUpTo: Rung;
  honorReceipts: boolean;
  dayZero?: AgentId[];
}

export const DEFAULT_CONFIG: EngineConfig = { autoContainUpTo: "sandbox", honorReceipts: true };

export const LENS_CAP: Record<Lens, number> = { mandate: 70, taint: 30, self: 34, herd: 24, chain: 40, drift: 30, story: 40 };

export interface LedgerEntry {
  at: number;
  agent: AgentId;
  type: string;
  description: string;
  receipt?: Receipt;
  honored: boolean;
  covers: string[];
}

interface SessionState {
  id: string;
  agent: Agent;
  factors: Map<string, Factor>;
  tainted: boolean;
  taintSources: string[];
  stages: Set<StoryStage>;
  rung: Rung;
  manual?: Rung;
  denied: number;
  persisted: boolean;
  servedCanaries: Map<string, string>;
  passport?: Passport;
  untrustedTools: Set<string>;
  history: Assessment[];
}

const rungIndex = (r: Rung) => RUNGS.indexOf(r);
const maxRung = (a: Rung, b: Rung) => (rungIndex(a) >= rungIndex(b) ? a : b);
const minRung = (a: Rung, b: Rung) => (rungIndex(a) <= rungIndex(b) ? a : b);

export function rungFor(risk: number): Rung {
  let r: Rung = "observe";
  for (const rung of RUNGS) if (risk >= RUNG_FLOOR[rung]) r = rung;
  return r;
}

const isInternal = (host: string) => host.endsWith(".internal");

const selfCache = new Map<AgentId, Baseline>();
const herdCache = new Map<TemplateId, Baseline>();
const EMPTY = buildBaseline([]);

function selfBaseline(agent: Agent): Baseline {
  if (agent.createdDaysAgo === 0) return EMPTY;
  let b = selfCache.get(agent.id);
  if (!b) {
    b = buildBaseline(agentHistory(agent).sessions);
    selfCache.set(agent.id, b);
  }
  return b;
}

function herdBaseline(template: TemplateId): Baseline {
  let b = herdCache.get(template);
  if (!b) {
    b = buildBaseline(herdHistory(template).sessions);
    herdCache.set(template, b);
  }
  return b;
}

export class MandateEngine {
  private knownHosts = new Set<string>();
  readonly config: EngineConfig;
  mandates: Record<AgentId, SignedMandate>;
  readonly self = new Map<AgentId, Baseline>();
  readonly herd = new Map<TemplateId, Baseline>();
  readonly drift = new Map<AgentId, DriftTracker>();
  readonly ledger: LedgerEntry[] = [];
  private sessions = new Map<string, SessionState>();
  private lastSessionOf = new Map<AgentId, string>();
  private sanctioned = new Map<AgentId, { tools: Map<string, string>; hosts: Map<string, string>; classes: Map<string, string> }>();
  private pendingPassports = new Map<AgentId, Passport>();
  private extraGrants = new Map<AgentId, string[]>();

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mandates = baseMandates();
    for (const m of Object.values(this.mandates)) m.destinations.forEach((d) => this.knownHosts.add(d));
    for (const a of AGENTS) {
      const base = this.config.dayZero?.includes(a.id) ? EMPTY : selfBaseline(a);
      this.self.set(a.id, base);
      this.drift.set(a.id, new DriftTracker(base));
      if (!this.herd.has(a.template)) this.herd.set(a.template, herdBaseline(a.template));
    }
  }

  sessionHistory(session: string) {
    return this.sessions.get(session)?.history ?? [];
  }

  amendMandate(agent: AgentId, patch: { tools?: string[]; dataClasses?: MandateCard["dataClasses"]; destinations?: string[] }, receipt: Receipt) {
    const m = this.mandates[agent];
    const template = agentById(agent).template;
    const incoherent = (patch.dataClasses ?? []).filter((d) => !m.dataClasses.includes(d) && !TEMPLATE_UNIVERSE[template].includes(d));
    this.mandates[agent] = signMandate({
      ...m,
      version: m.version + 1,
      signedAt: "2026-10-19",
      tools: patch.tools ?? m.tools,
      dataClasses: patch.dataClasses ?? m.dataClasses,
      destinations: patch.destinations ?? m.destinations,
    });
    this.mandates[agent].destinations.forEach((d) => this.knownHosts.add(d));
    const added = [
      ...(patch.tools ?? []).filter((t) => !m.tools.includes(t)),
      ...(patch.dataClasses ?? []).filter((d) => !m.dataClasses.includes(d)),
      ...(patch.destinations ?? []).filter((d) => !m.destinations.includes(d)),
    ];
    const removed = [
      ...m.tools.filter((t) => patch.tools && !patch.tools.includes(t)),
      ...m.dataClasses.filter((d) => patch.dataClasses && !patch.dataClasses.includes(d)),
      ...m.destinations.filter((d) => patch.destinations && !patch.destinations.includes(d)),
    ];
    this.ledger.push({
      at: 0,
      agent,
      type: "mandate_amend",
      description: `Owner amendment v${m.version} → v${m.version + 1}${added.length ? ` · adds ${added.join(", ")}` : ""}${removed.length ? ` · removes ${removed.join(", ")}` : ""}`,
      receipt,
      honored: true,
      covers: added,
    });
    if (incoherent.length) this.pendingIncoherent.set(agent, incoherent);
  }

  private pendingIncoherent = new Map<AgentId, string[]>();

  private pendingManual = new Map<string, Rung>();

  setManualRung(session: string, rung: Rung) {
    const s = this.sessions.get(session);
    if (s) {
      s.manual = rung;
      s.rung = rung;
    } else this.pendingManual.set(session, rung);
  }

  private sanctionsFor(agent: AgentId) {
    let s = this.sanctioned.get(agent);
    if (!s) {
      s = { tools: new Map(), hosts: new Map(), classes: new Map() };
      this.sanctioned.set(agent, s);
    }
    return s;
  }

  private session(ev: AgentEvent): SessionState {
    let s = this.sessions.get(ev.session);
    if (!s) {
      const prev = this.lastSessionOf.get(ev.agent);
      if (prev && prev !== ev.session) this.drift.get(ev.agent)?.closeSession();
      this.lastSessionOf.set(ev.agent, ev.session);
      const passport = ev.parent ? this.pendingPassports.get(ev.parent) : undefined;
      if (ev.parent) this.pendingPassports.delete(ev.parent);
      s = {
        id: ev.session,
        agent: agentById(ev.agent),
        factors: new Map(),
        tainted: false,
        taintSources: [],
        stages: new Set(),
        rung: "observe",
        denied: 0,
        persisted: false,
        servedCanaries: new Map(),
        passport,
        untrustedTools: new Set(),
        history: [],
      };
      const manual = this.pendingManual.get(ev.session);
      if (manual) {
        s.manual = manual;
        s.rung = manual;
        this.pendingManual.delete(ev.session);
      }
      this.sessions.set(ev.session, s);
    }
    return s;
  }

  assess(ev: AgentEvent): Assessment {
    const s = this.session(ev);
    const mandate = this.mandates[ev.agent];
    const agent = s.agent;
    const self = this.self.get(ev.agent)!;
    const herd = this.herd.get(agent.template)!;
    const sanction = this.sanctionsFor(ev.agent);
    const before = new Set(s.factors.keys());
    const prevRisk = s.history.at(-1)?.risk ?? 0;
    const violations: string[] = [];
    const sens = ev.dataClass ? SENSITIVITY[ev.dataClass] : 0;
    const coldStart = self.sessions < 20;

    const add = (f: Factor) => {
      const existing = s.factors.get(f.key);
      if (!existing || f.points > existing.points) {
        s.factors.set(f.key, { ...f, evidence: [...(existing?.evidence ?? []), ev.id] });
      } else if (!existing.evidence.includes(ev.id)) {
        existing.evidence.push(ev.id);
      }
    };

    if (ev.kind === "change" && ev.change) {
      const c = ev.change;
      if (c.type === "deploy" || c.type === "tool_register") {
        const grants = this.extraGrants.get(ev.agent) ?? [];
        c.covers?.tools?.forEach((t) => grants.push(`${t.split(".")[0]}:*`));
        this.extraGrants.set(ev.agent, grants);
      }
      const honored = !!c.receipt && this.config.honorReceipts;
      const covers = [...(c.covers?.tools ?? []), ...(c.covers?.hosts ?? []), ...(c.covers?.dataClasses ?? [])];
      this.ledger.push({ at: ev.at, agent: ev.agent, type: c.type, description: c.description, receipt: c.receipt, honored, covers });
      if (honored) {
        const rid = c.receipt!.id;
        c.covers?.tools?.forEach((t) => sanction.tools.set(t, rid));
        c.covers?.hosts?.forEach((h) => sanction.hosts.set(h, rid));
        c.covers?.dataClasses?.forEach((d) => sanction.classes.set(d, rid));
        if (c.type === "mandate_amend") {
          const incoherent = (c.covers?.dataClasses ?? []).filter((d) => !TEMPLATE_UNIVERSE[agent.template].includes(d));
          this.mandates[ev.agent] = signMandate({
            ...mandate,
            version: mandate.version + 1,
            signedAt: "2026-10-19",
            tools: [...new Set([...mandate.tools, ...(c.covers?.tools ?? [])])],
            destinations: [...new Set([...mandate.destinations, ...(c.covers?.hosts ?? [])])],
            dataClasses: [...new Set([...mandate.dataClasses, ...(c.covers?.dataClasses ?? [])])],
          });
          this.mandates[ev.agent].destinations.forEach((d) => this.knownHosts.add(d));
          if (incoherent.length) {
            add({ key: "mandate:incoherent-amend", lens: "mandate", label: "Amendment outside the role template", detail: `${incoherent.join(", ")} data is not part of any ${agent.template} role`, points: 16, certainty: "observed", evidence: [] });
          }
        }
      } else {
        add({
          key: `mandate:unreceipted:${c.type}:${c.toolHash?.tool ?? c.description}`,
          lens: "mandate",
          label: "Change with no receipt",
          detail: `${c.description}: no deploy, ticket or owner approval on record`,
          points: c.type === "tool_update" ? 18 : 12,
          certainty: "observed",
          evidence: [],
        });
        if (c.toolHash) s.untrustedTools.add(c.toolHash.tool);
        c.covers?.tools?.forEach((t) => sanction.tools.delete(t));
      }
    }

    const m = this.mandates[ev.agent];
    const incoherentAmend = this.pendingIncoherent.get(ev.agent);
    if (incoherentAmend && !s.factors.has("mandate:incoherent-amend")) {
      add({ key: "mandate:incoherent-amend", lens: "mandate", label: "Amendment outside the role template", detail: `${incoherentAmend.join(", ")} data is not part of any ${agent.template} role; the amendment is on record but flagged`, points: 16, certainty: "observed", evidence: [] });
    }
    const toolIn = m.tools.includes(ev.tool);
    const classIn = !ev.dataClass || m.dataClasses.includes(ev.dataClass);
    const destIn = !ev.dest || m.destinations.includes(ev.dest);
    const delegateIn = ev.kind !== "delegate" || (!!ev.delegateTo && m.mayDelegateTo.includes(ev.delegateTo));
    const authorityIn = !s.passport || !ev.dataClass || s.passport.authority.includes(ev.dataClass) || ev.kind === "egress";
    const overRecords = ev.kind === "read" && sens >= 1 && ev.records !== undefined && ev.records > m.limits.maxRecordsPerRead;
    const overBytes = ev.bytes !== undefined && ev.bytes > m.limits.maxBytesOut;
    const honey = honeytokenFor(ev.resource);

    if (ev.kind !== "change") {
      if (!toolIn) {
        violations.push(`tool ${ev.tool}`);
        add({ key: `mandate:tool:${ev.tool}`, lens: "mandate", label: "Tool outside the mandate", detail: `${ev.tool} is not on the Mandate Card`, points: 12, certainty: "observed", evidence: [] });
      }
      if (!classIn && ev.dataClass) {
        violations.push(`${ev.dataClass} data`);
        const full = 8 + 6 * sens;
        add({
          key: `mandate:class:${ev.dataClass}`,
          lens: "mandate",
          label: `${ev.dataClass.toUpperCase()} data is outside the role`,
          detail: `${ev.kind === "list" ? "Listed" : "Read"} ${ev.resource ?? ev.dataClass}; ${m.role} is mandated for ${m.dataClasses.join(", ")}`,
          points: ev.kind === "list" ? Math.round(full / 2) : full,
          certainty: "observed",
          evidence: [],
        });
      }
      if (!destIn && ev.dest) {
        violations.push(`destination ${ev.dest}`);
        const unknown = !this.knownHosts.has(ev.dest) && !isInternal(ev.dest);
        add({
          key: `mandate:dest:${ev.dest}`,
          lens: "mandate",
          label: unknown ? "Unknown external destination" : "Destination outside the mandate",
          detail: `${ev.kind === "egress" ? "Sent" : "Called"} ${ev.dest}${ev.bytes ? ` (${(ev.bytes / 1000).toFixed(1)} KB)` : ""}`,
          points: unknown ? 22 : 10,
          certainty: "observed",
          evidence: [],
        });
      }
      if (!delegateIn) {
        violations.push(`delegation to ${ev.delegateTo}`);
        add({ key: `mandate:delegate:${ev.delegateTo}`, lens: "mandate", label: "Delegation outside the mandate", detail: `${m.role} may not call ${ev.delegateTo}`, points: 14, certainty: "observed", evidence: [] });
      }
      if (overRecords) {
        violations.push("record limit");
        add({ key: `mandate:records:${ev.dataClass}`, lens: "mandate", label: "Read above the mandate limit", detail: `${ev.records} records; limit ${m.limits.maxRecordsPerRead} per read`, points: 10, certainty: "observed", evidence: [] });
      }
      if (overBytes) {
        violations.push("byte limit");
        add({ key: `mandate:bytes`, lens: "mandate", label: "Transfer above the mandate limit", detail: `${(ev.bytes! / 1000).toFixed(1)} KB; limit ${(m.limits.maxBytesOut / 1000).toFixed(0)} KB`, points: 10, certainty: "observed", evidence: [] });
      }
      if (!authorityIn && s.passport) {
        violations.push("delegated authority");
        add({ key: `chain:authority:${ev.dataClass}`, lens: "chain", label: "Outside delegated authority", detail: `Passport from ${s.passport.hops.at(-1)} grants ${s.passport.authority.join(", ") || "nothing"}; read ${ev.dataClass}`, points: 14, certainty: "observed", evidence: [] });
      }
    }

    if (ev.kind === "ingest" && ev.provenance === "untrusted") {
      s.tainted = true;
      s.taintSources.push(ev.source ?? ev.tool);
      s.stages.add("taint");
      add({ key: "taint:ingest", lens: "taint", label: "Untrusted content entered context", detail: ev.source ?? ev.summary, points: 6, certainty: "observed", evidence: [] });
    }
    if (s.untrustedTools.has(ev.tool) && ev.kind !== "change") {
      s.tainted = true;
      s.taintSources.push(`output of ${ev.tool}`);
      s.stages.add("taint");
      add({ key: "taint:tool", lens: "taint", label: "Output from a changed tool", detail: `${ev.tool} changed definition without a receipt; its output is treated as untrusted`, points: 8, certainty: "inferred", evidence: [] });
    }
    if (s.passport?.tainted && !s.factors.has("chain:inherited")) {
      s.tainted = true;
      s.stages.add("taint");
      s.taintSources.push(...s.passport.taintSources);
      add({ key: "chain:inherited", lens: "chain", label: "Called with a tainted passport", detail: `Origin ${s.passport.origin}; hops ${s.passport.hops.join(" → ")}`, points: 10, certainty: "inferred", evidence: [] });
    }

    const sensitiveReach = (ev.kind === "read" || ev.kind === "list") && !!ev.dataClass && (!classIn || !authorityIn || overRecords || !!honey);
    if (sensitiveReach && s.tainted) {
      s.stages.add("reach");
      add({ key: "taint:reach", lens: "taint", label: "Sensitive reach after untrusted input", detail: `${ev.resource ?? ev.dataClass} touched after ${s.taintSources[0]}`, points: 12, certainty: "inferred", evidence: [] });
      add({ key: "story:reach", lens: "story", label: "Story: taint → reach", detail: "Untrusted input was followed by sensitive data access", points: 8, certainty: "inferred", evidence: [] });
    } else if (sensitiveReach) {
      s.stages.add("reach");
    }

    const leaky =
      (ev.kind === "egress" && (!destIn || overBytes || (ev.payloadEntropy ?? 0) > 5)) || (ev.kind === "delegate" && s.stages.has("reach"));
    if (leaky && s.stages.has("reach")) {
      s.stages.add("leak");
      if (s.tainted) {
        add({ key: "taint:leak", lens: "taint", label: "Outbound transfer after untrusted input", detail: `${ev.dest ?? ev.delegateTo} after ${s.taintSources[0]}`, points: 12, certainty: "inferred", evidence: [] });
        add({ key: "story:leak", lens: "story", label: "Story: taint → reach → leak", detail: "The exfiltration shape: untrusted input, sensitive read, outbound transfer", points: 20, certainty: "inferred", evidence: [] });
      } else {
        add({ key: "story:reach-leak", lens: "story", label: "Story: reach → leak", detail: "Sensitive read followed by an outbound transfer", points: 14, certainty: "inferred", evidence: [] });
      }
    }
    if ((ev.payloadEntropy ?? 0) > 5 && ev.kind === "egress") {
      add({ key: "self:entropy", lens: "self", label: "Encoded payload in request", detail: `${ev.payloadEntropy!.toFixed(1)} bits/char to ${ev.dest}; own baseline sends plain text`, points: 10, certainty: "observed", evidence: [] });
    }

    const waive = (kind: "tools" | "hosts" | "classes", k: string) => sanction[kind].get(k);
    const novelty = (lens: "self" | "herd", base: Baseline, attr: string, value: string | undefined, kindKey: "tools" | "hosts" | "classes" | null, pts: number, mult = 1) => {
      if (!value || base.sessions === 0) return;
      const map = attr === "tool" ? base.tool : attr === "class" ? base.dataClass : attr === "dest" ? base.dest : base.client;
      const count = map.get(value) ?? 0;
      const share = count / base.sessions;
      const who = lens === "self" ? `${agent.id}'s` : `${HERD_SIZE[agent.template]} ${agent.template} peers'`;
      if (share >= 0.02) return;
      const rid = kindKey ? waive(kindKey, value) : undefined;
      const points = Math.round((count === 0 ? pts : pts / 2) * mult);
      add({
        key: `${lens}:${attr}:${value}`,
        lens,
        label: count === 0 ? `Never seen: ${attr} ${value.split("|")[0]}` : `Rare: ${attr} ${value.split("|")[0]}`,
        detail: `${count} of ${base.sessions} ${who} sessions${mult > 1 ? " · cold start: herd weighted ×2" : ""}`,
        points: rid ? 0 : points,
        certainty: "observed",
        evidence: [],
        waivedBy: rid,
      });
    };

    if (ev.kind !== "change") {
      novelty("self", self, "tool", ev.tool, "tools", 4);
      novelty("self", self, "class", ev.dataClass, "classes", 6);
      novelty("self", self, "dest", ev.dest, "hosts", 6);
      if (ev.client) novelty("self", self, "client", `${ev.client.userAgent}|${ev.client.asn}`, null, 16);
      const hm = coldStart ? 2 : 1;
      novelty("herd", herd, "tool", ev.tool, "tools", 4, hm);
      novelty("herd", herd, "class", ev.dataClass, "classes", 6, hm);
      novelty("herd", herd, "dest", ev.dest, "hosts", 6, hm);

      if (ev.kind === "read" && ev.dataClass && ev.records !== undefined) {
        const st = self.perRead.get(ev.dataClass);
        if (st && st.n >= 10) {
          const z = (ev.records - st.mean) / Math.max(st.std, 1);
          if (z > 3) add({ key: `self:volume:${ev.dataClass}`, lens: "self", label: "Volume far above own baseline", detail: `${ev.records} ${ev.dataClass} records; z = +${z.toFixed(1)} against ${st.n} past reads`, points: 6, certainty: "observed", evidence: [] });
        }
      }

      if (ev.kind === "read" && ev.dataClass === "credentials" && s.factors.has(`self:client:${ev.client?.userAgent}|${ev.client?.asn}`)) {
        s.stages.add("reach");
        add({ key: "story:credential-hunt", lens: "story", label: "Story: credential hunt", detail: "Unfamiliar client searching for secrets", points: 20, certainty: "inferred", evidence: [] });
      }
    }

    if (honey) {
      add({ key: `mandate:honeytoken:${honey.id}`, lens: "mandate", label: "Honeytoken touched", detail: `${honey.id} ${honey.resource}: ${honey.note}`, points: 40, certainty: "observed", evidence: [] });
    }
    const canary = ev.carries?.map((id) => s.servedCanaries.get(id)).find(Boolean);
    if (canary && (ev.kind === "egress" || ev.kind === "delegate")) {
      add({ key: `mandate:canary:${canary}`, lens: "mandate", label: "Decoy canary leaving the network", detail: `Canary ${canary} from served decoy rows found in the payload to ${ev.dest}`, points: 40, certainty: "observed", evidence: [] });
    }

    if (ev.kind === "delegate" && ev.delegateTo) {
      const requested = ev.requested ?? [];
      const callerAuthority = s.passport
        ? s.passport.authority
        : m.actsForRequester
          ? s.tainted
            ? ["public" as const]
            : requested
          : m.dataClasses;
      const laundered = requested.filter((r) => !callerAuthority.includes(r));
      if (laundered.length) {
        add({ key: `chain:launder:${ev.delegateTo}`, lens: "chain", label: "Authority would grow across a hop", detail: `Asked ${ev.delegateTo} for ${laundered.join(", ")}, which ${s.passport ? "its passport does not carry" : `${agent.id} cannot access itself`}`, points: 20, certainty: "observed", evidence: [] });
        if (s.passport) violations.push("authority beyond passport");
      }
      const target = this.mandates[ev.delegateTo];
      this.pendingPassports.set(ev.id, {
        origin: s.passport?.origin ?? `${agent.id}${s.taintSources[0] ? ` ← ${s.taintSources[0]}` : ""}`,
        hops: [...(s.passport?.hops ?? []), agent.id],
        tainted: s.tainted,
        taintSources: [...s.taintSources],
        authority: requested.filter((r) => callerAuthority.includes(r) && target.dataClasses.includes(r)),
      });
    }

    const tracker = this.drift.get(ev.agent)!;
    if (ev.kind === "read" && ev.dataClass && ev.records !== undefined && violations.length === 0 && !honey) tracker.observe(ev.dataClass, ev.records);
    const drift = tracker.peek();
    if (drift?.exceeded) {
      add({ key: `drift:${drift.dataClass}`, lens: "drift", label: "Drift budget exhausted", detail: `${drift.dataClass} volume has run above the signed baseline for long enough to spend the budget (CUSUM ${drift.cusum.toFixed(1)} of ${DRIFT_H})`, points: 30, certainty: "observed", evidence: [] });
    }
    const driftFill = drift?.fill ?? 0;

    const outOfBounds = violations.length > 0 || !!honey;
    if (outOfBounds && s.denied > 0 && !s.persisted) {
      s.persisted = true;
      add({ key: "self:persist", lens: "self", label: "Retried after denial", detail: "Kept reaching outside the mandate after the gateway refused", points: 10, certainty: "observed", evidence: [] });
    }

    const factors = [...s.factors.values()];
    const lensTotals: Record<Lens, number> = { mandate: 0, taint: 0, self: 0, herd: 0, chain: 0, drift: 0, story: 0 };
    for (const f of factors) lensTotals[f.lens] += f.points;
    const risk = Math.min(100, Object.entries(lensTotals).reduce((sum, [l, v]) => sum + Math.min(v, LENS_CAP[l as Lens]), 0));

    const recommended = rungFor(risk);
    const auto = minRung(recommended, this.config.autoContainUpTo);
    s.rung = s.manual ? maxRung(s.manual, auto) : maxRung(s.rung, auto);
    if (s.manual === "revoke") s.rung = "revoke";

    let decision: Decision = "allowed";
    let note: string | undefined;
    switch (s.rung) {
      case "revoke":
        decision = "denied_revoked";
        note = "Token revoked; session terminated";
        break;
      case "sandbox":
        if (outOfBounds) {
          if (ev.kind === "read" || ev.kind === "list") {
            decision = "decoy_served";
            const canaryId = `CN-${((ev.seq + 3) * 7919 + 4111).toString(16).toUpperCase().slice(-4)}`;
            s.servedCanaries.set(ev.id, canaryId);
            note = `Decoy rows served, canary ${canaryId}`;
          } else if (ev.kind === "egress" || ev.kind === "delegate") {
            decision = "captured";
            note = `Sinkholed; destination and payload recorded`;
          } else decision = "denied_scope";
        }
        break;
      case "scope":
        if (outOfBounds) {
          decision = "denied_scope";
          note = "Scope-down token refuses anything off the Mandate Card";
        }
        break;
      case "approval":
        if (outOfBounds) {
          decision = "held";
          note = `Held for ${m.owner}`;
        }
        break;
    }
    if (honey && decision !== "denied_revoked" && decision !== "decoy_served") {
      decision = "decoy_served";
      s.servedCanaries.set(ev.id, honey.id);
      note = `${honey.id} is a decoy; its canary values are now being watched`;
    }
    if (decision === "denied_scope" || decision === "held") s.denied++;

    const channels = {} as Record<Lens, number>;
    for (const l of Object.keys(lensTotals) as Lens[]) channels[l] = Math.min(1, lensTotals[l] / LENS_CAP[l]);
    channels.drift = Math.min(1.15, Math.max(channels.drift, driftFill));

    const assessment: Assessment = {
      event: ev,
      iam: iamCheck(ev, [...agent.granted, ...(this.extraGrants.get(ev.agent) ?? [])]) ? "allow" : "deny",
      inMandate: violations.length === 0,
      violations,
      risk,
      delta: risk - prevRisk,
      channels,
      factors: factors.sort((a, b) => b.points - a.points),
      newFactors: [...s.factors.keys()].filter((k) => !before.has(k)),
      rung: s.rung,
      recommended,
      decision,
      stages: [...s.stages],
      passport: s.passport,
      drift,
      note,
    };
    s.history.push(assessment);
    return assessment;
  }
}

const scopeFor = (ev: AgentEvent): string => {
  const [ns, verb] = ev.tool.split(".");
  if (ev.kind === "egress") return `http:post:${ev.dest}`;
  if (ev.kind === "delegate") return `agents:invoke:${ev.delegateTo}`;
  if (ev.tool.startsWith("fs.")) return `fs:read:${ev.resource ?? "/"}`;
  return `${ns}:${verb}`;
};

const globMatch = (pattern: string, value: string) => {
  const re = new RegExp("^" + pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\/]/g, "\\$&")).join(".*") + "$");
  return re.test(value);
};

export function iamCheck(ev: AgentEvent, granted: string[]): boolean {
  if (ev.kind === "change") return true;
  const needed = scopeFor(ev);
  return granted.some((g) => {
    if (g.endsWith(":*")) return needed.startsWith(g.slice(0, -1)) || globMatch(g, needed);
    if (g.endsWith("/**")) return needed.startsWith(g.slice(0, -2));
    return globMatch(g, needed) || needed.startsWith(g + ":");
  });
}
