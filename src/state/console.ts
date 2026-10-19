import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { MandateEngine } from "@/engine/engine";
import { scenarioByKey, type Scenario } from "@/engine/scenarios";
import type { AgentId, Assessment, DataClass, Receipt, Rung } from "@/engine/types";

export type View = "recorder" | "chain" | "ledger" | "mandate" | "calibration";

export interface ManualAction {
  index: number;
  session: string;
  rung: Rung;
}

export interface Amendment {
  agent: AgentId;
  patch: { tools?: string[]; dataClasses?: DataClass[]; destinations?: string[] };
  receipt: Receipt;
}

interface ConsoleState {
  scenarioKey: string;
  policy: Rung;
  receipts: boolean | null;
  actions: ManualAction[];
  amendments: Amendment[];
  view: View;
  index: number;
  scrub: number | null;
  focusAgent: AgentId | null;
  setScenario: (key: string) => void;
  setPolicy: (r: Rung) => void;
  setReceipts: (v: boolean | null) => void;
  addAction: (a: ManualAction) => void;
  clearActions: () => void;
  amend: (a: Amendment) => void;
  resetAmendments: () => void;
  setView: (v: View) => void;
  setIndex: (i: number) => void;
  setScrub: (t: number | null) => void;
  setFocusAgent: (a: AgentId | null) => void;
}

const initialKey = () => {
  const p = new URLSearchParams(window.location.search).get("case");
  return p ? scenarioByKey(p).key : "poisoned-pdf";
};

export const useConsole = create<ConsoleState>((set) => ({
  scenarioKey: initialKey(),
  policy: "sandbox",
  receipts: null,
  actions: [],
  amendments: [],
  view: "recorder",
  index: -1,
  scrub: null,
  focusAgent: null,
  setScenario: (key) => {
    const url = new URL(window.location.href);
    url.searchParams.set("case", key);
    window.history.replaceState({}, "", url);
    clock.reset();
    set({ scenarioKey: key, actions: [], amendments: [], receipts: null, index: -1, scrub: null, focusAgent: null });
  },
  setPolicy: (policy) => set({ policy }),
  setReceipts: (receipts) => set({ receipts }),
  addAction: (a) => set((s) => ({ actions: [...s.actions.filter((x) => !(x.index === a.index && x.session === a.session)), a] })),
  clearActions: () => set({ actions: [] }),
  amend: (a) => set((s) => ({ amendments: [...s.amendments, a] })),
  resetAmendments: () => set({ amendments: [] }),
  setView: (view) => set({ view }),
  setIndex: (index) => set({ index }),
  setScrub: (scrub) => set({ scrub }),
  setFocusAgent: (focusAgent) => set({ focusAgent }),
}));

export interface ComputedRun {
  scenario: Scenario;
  engine: MandateEngine;
  steps: Assessment[];
  duration: number;
  honorReceipts: boolean;
}

export function computeRun(scenario: Scenario, policy: Rung, receipts: boolean | null, actions: ManualAction[], amendments: Amendment[]): ComputedRun {
  const honorReceipts = receipts ?? scenario.honorReceipts ?? true;
  const engine = new MandateEngine({ autoContainUpTo: policy, honorReceipts, dayZero: scenario.dayZero });
  for (const a of amendments) engine.amendMandate(a.agent, a.patch, a.receipt);
  const steps = scenario.events.map((e, i) => {
    for (const a of actions) if (a.index === i) engine.setManualRung(a.session, a.rung);
    return engine.assess(e);
  });
  const duration = (steps.at(-1)?.event.at ?? 0) + 2600;
  return { scenario, engine, steps, duration, honorReceipts };
}

type Listener = () => void;

class Clock {
  t = 0;
  playing = false;
  speed = 1;
  duration = 1;
  private last = 0;
  private listeners = new Set<Listener>();
  private version = 0;

  get = () => {
    const now = performance.now();
    if (this.playing) {
      this.t = Math.min(this.duration, this.t + (now - this.last) * this.speed);
      if (this.t >= this.duration) {
        this.playing = false;
        this.emit();
      }
    }
    this.last = now;
    return this.t;
  };

  play() {
    if (this.t >= this.duration) this.t = 0;
    this.playing = true;
    this.last = performance.now();
    this.emit();
  }
  pause() {
    this.get();
    this.playing = false;
    this.emit();
  }
  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }
  seek(t: number) {
    this.t = Math.max(0, Math.min(this.duration, t));
    this.last = performance.now();
    this.emit();
  }
  setSpeed(s: number) {
    this.get();
    this.speed = s;
    this.emit();
  }
  reset() {
    this.t = 0;
    this.playing = false;
    this.emit();
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  snapshot = () => this.version;
  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
}

export const clock = new Clock();

export function useClock() {
  const version = useSyncExternalStore(clock.subscribe, clock.snapshot);
  return { playing: clock.playing, speed: clock.speed, version };
}
