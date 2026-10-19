import type { AgentEvent, DataClass } from "./types";

export interface Stat {
  mean: number;
  std: number;
  n: number;
}

export interface Baseline {
  sessions: number;
  tool: Map<string, number>;
  dataClass: Map<string, number>;
  dest: Map<string, number>;
  client: Map<string, number>;
  perRead: Map<DataClass, Stat>;
  perSession: Map<DataClass, Stat>;
}

const bump = (m: Map<string, number>, k: string | undefined) => {
  if (k) m.set(k, (m.get(k) ?? 0) + 1);
};

function stat(values: number[]): Stat {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  return { mean, std: Math.sqrt(variance), n };
}

export function buildBaseline(sessions: AgentEvent[][]): Baseline {
  const b: Baseline = {
    sessions: sessions.length,
    tool: new Map(),
    dataClass: new Map(),
    dest: new Map(),
    client: new Map(),
    perRead: new Map(),
    perSession: new Map(),
  };
  const reads = new Map<DataClass, number[]>();
  const perSession = new Map<DataClass, number[]>();
  for (const s of sessions) {
    const tools = new Set<string>();
    const classes = new Set<string>();
    const dests = new Set<string>();
    const clients = new Set<string>();
    const sums = new Map<DataClass, number>();
    for (const e of s) {
      tools.add(e.tool);
      if (e.dataClass) classes.add(e.dataClass);
      if (e.dest) dests.add(e.dest);
      if (e.client) clients.add(`${e.client.userAgent}|${e.client.asn}`);
      if ((e.kind === "read" || e.kind === "write") && e.dataClass && e.records !== undefined) {
        if (e.kind === "read") {
          const arr = reads.get(e.dataClass) ?? [];
          arr.push(e.records);
          reads.set(e.dataClass, arr);
        }
        sums.set(e.dataClass, (sums.get(e.dataClass) ?? 0) + e.records);
      }
    }
    tools.forEach((t) => bump(b.tool, t));
    classes.forEach((c) => bump(b.dataClass, c));
    dests.forEach((d) => bump(b.dest, d));
    clients.forEach((c) => bump(b.client, c));
    for (const c of new Set([...perSession.keys(), ...sums.keys()])) {
      const arr = perSession.get(c) ?? [];
      arr.push(sums.get(c) ?? 0);
      perSession.set(c, arr);
    }
  }
  reads.forEach((v, k) => b.perRead.set(k, stat(v)));
  perSession.forEach((v, k) => {
    const padded = [...Array(Math.max(0, sessions.length - v.length)).fill(0), ...v];
    b.perSession.set(k, stat(padded));
  });
  return b;
}

export interface DriftReading {
  dataClass: DataClass;
  value: number;
  zAnchored: number;
  zRolling: number;
  cusum: number;
  fill: number;
  exceeded: boolean;
}

export const DRIFT_K = 0.5;
export const DRIFT_H = 6;

export class DriftTracker {
  private committed = new Map<DataClass, number>();
  private rolling = new Map<DataClass, number[]>();
  private live = new Map<DataClass, number>();

  constructor(private anchor: Baseline) {}

  reset() {
    this.committed.clear();
    this.rolling.clear();
    this.live.clear();
  }

  observe(dataClass: DataClass, records: number): DriftReading | undefined {
    const base = this.anchor.perSession.get(dataClass);
    if (!base || base.n < 10) return undefined;
    const value = (this.live.get(dataClass) ?? 0) + records;
    this.live.set(dataClass, value);
    return this.reading(dataClass, value, base);
  }

  peek(): DriftReading | undefined {
    let top: DriftReading | undefined;
    const classes = new Set<DataClass>([...this.live.keys(), ...this.committed.keys()]);
    for (const c of classes) {
      const base = this.anchor.perSession.get(c);
      if (!base || base.n < 10) continue;
      const spent = this.committed.get(c) ?? 0;
      const v = this.live.get(c);
      const r = v !== undefined ? this.reading(c, v, base) : { dataClass: c, value: 0, zAnchored: 0, zRolling: 0, cusum: spent, fill: 0, exceeded: false };
      const cusum = Math.max(r.cusum, spent);
      const held = { ...r, cusum, fill: cusum / DRIFT_H, exceeded: cusum > DRIFT_H };
      if (!top || held.fill > top.fill) top = held;
    }
    return top;
  }

  private reading(dataClass: DataClass, value: number, base: Stat): DriftReading {
    const sd = Math.max(base.std, 1);
    const zAnchored = (value - base.mean) / sd;
    const s = Math.max(0, (this.committed.get(dataClass) ?? 0) + zAnchored - DRIFT_K);
    const window = this.rolling.get(dataClass) ?? [];
    let zRolling = zAnchored;
    if (window.length >= 3) {
      const m = window.reduce((a, b) => a + b, 0) / window.length;
      const v = window.reduce((a, b) => a + (b - m) ** 2, 0) / (window.length - 1);
      zRolling = (value - m) / Math.max(Math.sqrt(v), sd * 0.25, 1);
    }
    return { dataClass, value, zAnchored, zRolling, cusum: s, fill: s / DRIFT_H, exceeded: s > DRIFT_H };
  }

  closeSession() {
    for (const [c, v] of this.live) {
      const base = this.anchor.perSession.get(c);
      if (!base || base.n < 10) continue;
      const r = this.reading(c, v, base);
      this.committed.set(c, r.cusum);
      const w = [...(this.rolling.get(c) ?? []), v].slice(-5);
      this.rolling.set(c, w);
    }
    this.live.clear();
  }
}
