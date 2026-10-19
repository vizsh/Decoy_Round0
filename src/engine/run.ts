import { MandateEngine } from "./engine";
import type { Scenario } from "./scenarios";
import type { Assessment, Rung } from "./types";

export interface Run {
  scenario: Scenario;
  engine: MandateEngine;
  steps: Assessment[];
}

export function runScenario(scenario: Scenario, autoContainUpTo: Rung = "sandbox"): Run {
  const engine = new MandateEngine({
    autoContainUpTo,
    honorReceipts: scenario.honorReceipts ?? true,
    dayZero: scenario.dayZero,
  });
  const steps = scenario.events.map((e) => engine.assess(e));
  return { scenario, engine, steps };
}

export function firstLeakAttempt(steps: Assessment[]): Assessment | undefined {
  return steps.find((s) => s.event.kind === "egress" || (s.event.kind === "delegate" && s.stages.includes("reach")));
}

export function contained(a: Assessment | undefined): boolean {
  return !!a && a.decision !== "allowed";
}
