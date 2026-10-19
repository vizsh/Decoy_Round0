import { describe, expect, it } from "vitest";
import { runScenario, firstLeakAttempt } from "./run";
import { driftEvents, scenarioByKey, SCENARIOS } from "./scenarios";
import { iamCheck, MandateEngine } from "./engine";
import { AGENTS } from "./world";
import { evaluate } from "./evaluate";

const trace = (key: string) => {
  const run = runScenario(scenarioByKey(key));
  return run.steps.map((s) => `${s.event.summary.padEnd(58)} risk ${String(s.risk).padStart(3)}  ${s.rung.padEnd(8)} ${s.decision}`);
};

describe("MANDATE engine", () => {
  it("prints every scenario trace", () => {
    for (const s of SCENARIOS) console.log(`\n${s.id} ${s.title}\n` + trace(s.key).join("\n"));
  });

  it("IAM allows every step of the poisoned PDF attack", () => {
    const run = runScenario(scenarioByKey("poisoned-pdf"));
    expect(run.steps.every((s) => s.iam === "allow")).toBe(true);
  });

  it("contains the poisoned PDF before data leaves, while purchase requests keep flowing", () => {
    const run = runScenario(scenarioByKey("poisoned-pdf"));
    expect(firstLeakAttempt(run.steps)?.decision).toBe("captured");
    const prs = run.steps.filter((s) => s.event.tool === "erp.create_purchase_request");
    expect(prs.every((s) => s.decision === "allowed")).toBe(true);
  });

  it("IAM allows every agent action in every case, which is the gap MANDATE fills", () => {
    for (const s of SCENARIOS) {
      const run = runScenario(s);
      const denied = run.steps.filter((x) => x.event.kind !== "change" && x.iam !== "allow").map((x) => `${s.key}:T${x.event.seq} ${x.event.tool}`);
      expect(denied).toEqual([]);
    }
  });

  it("does not alarm on a receipted deploy, but does on the same change without receipts", () => {
    const ok = runScenario(scenarioByKey("legit-deploy"));
    expect(Math.max(...ok.steps.map((s) => s.risk))).toBeLessThan(25);
    const bad = runScenario(scenarioByKey("unreceipted-deploy"));
    expect(Math.max(...bad.steps.map((s) => s.risk))).toBeGreaterThanOrEqual(45);
  });

  it("detects the slow drift through the anchored budget", () => {
    const run = runScenario(scenarioByKey("slow-drift"));
    expect(run.steps.some((s) => s.factors.some((f) => f.lens === "drift"))).toBe(true);
  });

  it("measures the slow-drift detection boundary within ten days", () => {
    const rows: string[] = [];
    for (let g = 1.1; g <= 1.4001; g += 0.02) {
      const engine = new MandateEngine();
      const steps = driftEvents(g, `b${g.toFixed(2)}`).map((e) => engine.assess(e));
      const hit = steps.find((s) => s.factors.some((f) => f.lens === "drift"));
      rows.push(`growth ${g.toFixed(2)}: ${hit ? `day ${hit.event.day}` : "not within 10 days"}`);
    }
    console.log("DRIFT BOUNDARY\n" + rows.join("\n"));
  });

  it("catches a day-zero agent with no history", () => {
    const run = runScenario(scenarioByKey("day-zero"));
    expect(firstLeakAttempt(run.steps)?.decision).not.toBe("allowed");
  });

  it("honest residual: inside-mandate misuse stays below the approval line", () => {
    const run = runScenario(scenarioByKey("inside-mandate"));
    expect(Math.max(...run.steps.map((s) => s.risk))).toBeLessThan(25);
  });

  it("runs the synthetic evaluation suite", () => {
    const r = evaluate();
    console.log(JSON.stringify(r, null, 2));
    expect(r.attackSessions).toBeGreaterThan(50);
  });

  it("grants IAM for normal tool namespaces", () => {
    const prc = AGENTS.find((a) => a.id === "PRC-01")!;
    expect(iamCheck({ id: "x", seq: 0, at: 0, agent: "PRC-01", session: "s", kind: "read", tool: "fs.read", summary: "", resource: "/hr/salaries_2026.xlsx" }, prc.granted)).toBe(true);
  });
});
