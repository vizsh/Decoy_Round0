import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import HoldButton from "@/components/HoldButton";
import { Recorder } from "@/components/recorder/Recorder";
import { valueAt } from "@/components/recorder/math";
import { Detent, Lamp } from "@/components/recorder/parts";
import { driftBoundary, evaluate, type EvalReport } from "@/engine/evaluate";
import { firstLeakAttempt, runScenario } from "@/engine/run";
import { scenarioByKey } from "@/engine/scenarios";
import { RUNGS, type Assessment, type Rung } from "@/engine/types";
import { baseMandates, HERD_SIZE } from "@/engine/world";
import { DRIFT_H } from "@/engine/baseline";
import { useSize } from "@/lib/hooks";
import { DECISION_LABEL, LANES, laneValue, RUNG_DOES, RUNG_LABEL, type LaneKey } from "@/lib/lenses";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

function Section({ id, title, lead, children, className, width = "wide" }: { id?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; className?: string; width?: "wide" | "narrow" }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("relative scroll-mt-16 px-4 py-24 sm:px-8 lg:py-32", className)}>
      <div className={cn("mx-auto max-w-[1360px]", width === "narrow" && "[&>*]:max-w-[1040px]")}>
        <h2 id={id ? `${id}-title` : undefined} className="max-w-[18ch] font-display text-[clamp(2.6rem,5vw,4.25rem)] leading-[0.92] font-extrabold tracking-[-0.01em] text-engrave">
          {title}
        </h2>
        {lead && <div className="mt-6 max-w-[62ch] text-[17.5px] leading-[1.65] text-engrave-2">{lead}</div>}
        {children}
      </div>
    </section>
  );
}

const SheetEdge = ({ flip }: { flip?: boolean }) => (
  <div aria-hidden="true" className={cn("flex h-3 items-center justify-around px-3", flip && "rotate-180")}>
    {Array.from({ length: 34 }, (_, i) => (
      <span key={i} className="size-[5px] rounded-full bg-housing-850 shadow-[inset_0_1px_1px_rgb(0_0_0/0.6)]" />
    ))}
  </div>
);

function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("paper relative rounded-[2px] shadow-[0_24px_48px_-24px_rgb(0_0_0/0.85),0_2px_0_rgb(0_0_0/0.35)]", className)}>
      <SheetEdge />
      {children}
      <SheetEdge flip />
    </div>
  );
}

function useRun(key: string, rung?: Rung) {
  return useMemo(() => runScenario(scenarioByKey(key), rung), [key, rung]);
}

/* ------------------------------------------------------------------ circles */

type Ring = "observed" | "declared" | "granted";

function ringOf(s: Assessment): Ring {
  if (!s.inMandate) return "granted";
  const novel = s.factors.some((f) => s.newFactors.includes(f.key) && (f.lens === "self" || f.lens === "herd") && f.points > 0);
  return novel ? "declared" : "observed";
}

export function CirclesSection() {
  const run = useRun("poisoned-pdf");
  const steps = run.steps.filter((s) => s.event.kind !== "change");
  const [sel, setSel] = useState(5);
  const R = { granted: 238, declared: 160, observed: 88 };
  const radius: Record<Ring, number> = { observed: 52, declared: 124, granted: 200 };
  const offset: Record<Ring, number> = { observed: -Math.PI / 2, declared: -Math.PI / 4, granted: Math.PI / 6 };
  const rings = steps.map(ringOf);
  const dots = steps.map((s, i) => {
    const ring = rings[i];
    const group = rings.map((r, j) => (r === ring ? j : -1)).filter((j) => j >= 0);
    const n = group.length;
    const j = group.indexOf(i);
    const spread = ring === "granted" ? Math.PI * 0.9 : Math.PI * 2;
    const a = offset[ring] + (n === 1 ? 0 : ring === "granted" ? (j / (n - 1)) * spread : (j / n) * spread);
    return { s, ring, x: Math.cos(a) * radius[ring], y: Math.sin(a) * radius[ring] };
  });
  const cur = steps[sel];
  return (
    <Section
      id="reading"
      title="IAM checks the outer ring. Nobody checks the middle one."
      lead={
        <p>
          A token says what an agent <em>can</em> touch. Its role says what it <em>should</em> touch. Its history shows what it actually does. Attacks live in the gap between the first two, where every access check still passes. MANDATE draws both inner rings and keeps comparing.
        </p>
      }
    >
      <div className="mt-14 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="mx-auto w-full max-w-[540px]">
          <svg viewBox="-260 -260 520 520" className="w-full" role="group" aria-label="Three nested rings with each step of the poisoned PDF case plotted">
            <circle r={R.granted} fill="var(--color-housing-800)" stroke="var(--color-engrave-3)" strokeDasharray="3 6" />
            <circle r={R.declared} fill="var(--color-housing-850)" stroke="var(--color-lamp-amber)" strokeOpacity={0.75} strokeWidth={1.5} />
            <circle r={R.observed} fill="var(--color-housing-700)" stroke="var(--color-engrave-2)" strokeOpacity={0.5} />
            <text y={-R.granted + 22} textAnchor="middle" className="engraved" fontSize={11}>Granted · IAM</text>
            <text y={-R.declared + 22} textAnchor="middle" className="engraved" fontSize={11} fill="var(--color-lamp-amber)">Declared · Mandate Card</text>
            <text y={-R.observed + 22} textAnchor="middle" className="engraved" fontSize={11}>Observed · baseline</text>
            {dots.map((d, i) => {
              const active = i === sel;
              const out = d.ring === "granted";
              return (
                <g key={d.s.event.id} transform={`translate(${d.x},${d.y})`} className="cursor-pointer" onClick={() => setSel(i)}>
                  <circle r={active ? 15 : 12} fill={out ? "var(--color-lamp-red)" : "var(--color-paper)"} stroke={active ? "var(--color-engrave)" : "rgb(0 0 0 / 0.6)"} strokeWidth={active ? 2 : 1} />
                  <text y={4} textAnchor="middle" fontSize={10.5} className="font-mono" fontWeight={600} fill={out ? "var(--color-housing-950)" : "var(--color-ink-black)"}>
                    T{d.s.event.seq}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Steps">
            {steps.map((s, i) => (
              <button key={s.event.id} role="tab" aria-selected={i === sel} onClick={() => setSel(i)} className={cn("key h-8 px-2.5 text-[10.5px]", i === sel ? "bg-housing-600 text-engrave" : "bg-housing-800 text-engrave-2 hover:bg-housing-700")}>
                T{s.event.seq}
              </button>
            ))}
          </div>
        </div>
        {cur && (
          <div className="panel hammertone p-6 sm:p-8" aria-live="polite">
            <p className="engraved text-[10px]">Step T{cur.event.seq} · {cur.event.agent}</p>
            <p className="mt-2 font-cond text-[26px] leading-tight font-semibold text-engrave">{cur.event.summary}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="seam rounded-[4px] bg-housing-900 p-4">
                <dt className="engraved text-[10px]">IAM says</dt>
                <dd className="mt-1.5 font-cond text-[19px] font-semibold text-lamp-green">Allow</dd>
                <dd className="mt-1 text-[14px] leading-snug text-engrave-2">The token’s scopes cover it: {cur.event.agent} holds {scopeHint(cur)}.</dd>
              </div>
              <div className="seam rounded-[4px] bg-housing-900 p-4">
                <dt className="engraved text-[10px]">Mandate says</dt>
                <dd className={cn("mt-1.5 font-cond text-[19px] font-semibold", cur.inMandate ? "text-lamp-green" : "text-lamp-red")}>{cur.inMandate ? "Within role" : "Outside the role"}</dd>
                <dd className="mt-1 text-[14px] leading-snug text-engrave-2">{cur.inMandate ? (ringOf(cur) === "declared" ? "Allowed by the card, but new for this agent." : "Matches the card and the agent’s history.") : `Off the card: ${cur.violations.join(", ")}.`}</dd>
              </div>
            </dl>
            <p className="mt-6 text-[14px] leading-relaxed text-engrave-3">Synthetic case run by the in-browser engine. The token held by PRC-01 is deliberately over-broad, as tokens usually are.</p>
          </div>
        )}
      </div>
    </Section>
  );
}

function scopeHint(s: Assessment) {
  if (s.event.kind === "egress") return "http:post:*";
  if (s.event.tool.startsWith("fs.")) return "fs:read:/**";
  if (s.event.tool.startsWith("erp.")) return "erp:*";
  if (s.event.tool.startsWith("suppliers.")) return "suppliers:*";
  return "email:read";
}

/* ------------------------------------------------------------------ readout */

export function ReadoutSection() {
  const run = useRun("poisoned-pdf");
  return (
    <Section
      title="Every step passes. The story doesn’t."
      lead={<p>Read one row at a time and nothing looks wrong: a file read, a directory listing, a POST. MANDATE scores the sequence against what the agent is for. Untrusted input, then sensitive reach, then an outbound transfer is the grammar of an exfiltration.</p>}
    >
      <Sheet className="mt-14 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-edge px-5 py-3 sm:px-8">
          <p className="printed text-[11px]">Examiner’s readout · case SCN-01 · PRC-01 Procurement Agent</p>
          <p className="font-mono text-[10px] text-ink-graphite">synthetic telemetry · same rules for every case</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="printed text-[10.5px]">
                <th className="px-5 py-3 font-semibold sm:pl-8">Step</th>
                <th className="px-3 py-3 font-semibold">What the agent did</th>
                <th className="px-3 py-3 font-semibold">IAM</th>
                <th className="px-3 py-3 font-semibold">Mandate gateway</th>
                <th className="px-3 py-3 text-right font-semibold">Risk</th>
                <th className="px-3 py-3 font-semibold sm:pr-8">Biggest new factor</th>
              </tr>
            </thead>
            <tbody>
              {run.steps.map((s) => {
                const top = s.factors.filter((f) => s.newFactors.includes(f.key) && f.points > 0).sort((a, b) => b.points - a.points)[0];
                const bad = s.decision !== "allowed";
                return (
                  <tr key={s.event.id} className="border-t border-grid-minor align-top">
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-graphite sm:pl-8">T{s.event.seq}</td>
                    <td className="px-3 py-3 font-cond text-[15.5px] font-semibold text-ink-black">{s.event.summary}</td>
                    <td className="px-3 py-3 font-mono text-[11.5px] text-ink-black">ALLOW</td>
                    <td className={cn("px-3 py-3 font-mono text-[11.5px]", bad ? "font-semibold text-ink-red" : "text-ink-black")}>{DECISION_LABEL[s.decision].toUpperCase()}</td>
                    <td className={cn("px-3 py-3 text-right font-mono text-[13px] tabular", s.risk >= 45 ? "font-semibold text-ink-red" : "text-ink-black")}>{s.risk}</td>
                    <td className="px-3 py-3 text-[14px] leading-snug text-ink-black sm:pr-8">
                      {top ? (
                        <>
                          <span className="font-mono text-[11.5px] text-ink-red">+{top.points}</span> {top.label}
                          <span className={cn("ml-1.5 text-[12px] text-ink-graphite", top.certainty === "inferred" && "italic")}>({top.certainty})</span>
                        </>
                      ) : (
                        <span className="text-ink-graphite">nothing new</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Sheet>
    </Section>
  );
}

/* ------------------------------------------------------------------ lenses */

function Trace({ steps, lane, ink, width = 260, height = 52 }: { steps: Assessment[]; lane: LaneKey; ink: string; width?: number; height?: number }) {
  const meta = LANES.find((l) => l.key === lane)!;
  const series = steps.map((s) => ({ t: s.event.at, v: laneValue(s, lane) }));
  const end = (steps.at(-1)?.event.at ?? 1000) + 900;
  const pts: string[] = [];
  for (let x = 0; x <= width; x += 3) {
    const v = valueAt(series, (x / width) * end);
    const y = height - 5 - (Math.min(v, meta.max) / meta.max) * (height - 10);
    pts.push(`${pts.length ? "L" : "M"}${x},${y.toFixed(1)}`);
  }
  const shelf = lane === "drift" ? height - 5 - (1 / meta.max) * (height - 10) : null;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="paper-grid block h-[52px] rounded-[2px]" aria-hidden="true">
      {shelf !== null && <line x1={0} x2={width} y1={shelf} y2={shelf} stroke="var(--color-ink-graphite)" strokeDasharray="5 3" strokeWidth={1} />}
      <path d={pts.join("")} fill="none" stroke={ink} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

const LENS_ROWS: { lane: LaneKey; scenario: string; how: string; catches: string; cite?: { label: string; url: string } }[] = [
  {
    lane: "mandate",
    scenario: "poisoned-pdf",
    how: "A signed, machine-readable job description: purpose, data classes, tools, destinations, delegation rights and limits. An LLM drafts it once from the agent’s system prompt, the owner signs it, and the gateway checks it with deterministic rules. No model sits in the decision path, so nothing in it can be prompt-injected.",
    catches: "Anything that leaves the role, from day zero.",
  },
  {
    lane: "taint",
    scenario: "poisoned-pdf",
    how: "Marks the session the moment untrusted content enters context: an external PDF, an email, a web page, the output of a changed tool. Later sensitive reads and transfers weigh more. It watches the effect, so it never has to win the text-classification race.",
    catches: "Indirect prompt injection.",
    cite: { label: "EchoLeak · CVE-2025-32711", url: "https://nvd.nist.gov/vuln/detail/CVE-2025-32711" },
  },
  {
    lane: "self",
    scenario: "stolen-token",
    how: "The agent’s own history: tools, data classes, destinations, client fingerprint and volumes, measured against the baseline signed with the mandate. A token driven from a VPS by python-requests looks nothing like the agent runtime.",
    catches: "Stolen tokens and unfamiliar clients.",
    cite: { label: "Salesloft Drift token theft", url: "https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift" },
  },
  {
    lane: "herd",
    scenario: "day-zero",
    how: `Peers built from the same template: ${HERD_SIZE.procurement} procurement agents in this fleet. An agent created this morning borrows their baseline, weighted double until it has history of its own.`,
    catches: "Cold start, for short-lived and new agents.",
  },
  {
    lane: "chain",
    scenario: "agent-chain",
    how: "Every delegation hop carries a passport: who or what started the chain, whether it is tainted, and an authority that can only shrink. An external email cannot buy finance access by passing through two agents.",
    catches: "Agent-to-agent spread and privilege laundering.",
    cite: { label: "Prompt Infection · arXiv 2410.07283", url: "https://arxiv.org/abs/2410.07283" },
  },
  {
    lane: "drift",
    scenario: "slow-drift",
    how: `A cumulative budget (CUSUM) against the signed baseline. Small steps add up until the budget of ${DRIFT_H} is spent. A rolling baseline would follow a patient attacker; this one is anchored to the mandate and does not move.`,
    catches: "Slow drift and mimicry under the threshold.",
  },
];

export function LensesSection() {
  const runs = useMemo(() => Object.fromEntries(LENS_ROWS.map((r) => [r.scenario, runScenario(scenarioByKey(r.scenario))])), []);
  return (
    <Section
      id="lenses"
      title="Six pens, one for each way in."
      lead={<p>Each lens answers one question and inks its own channel. The risk pen is the sum of their named factors, so every alert can be read back to the pen that raised it. The traces below are the engine’s output on the case each lens exists for.</p>}
    >
      <ol className="mt-14 divide-y divide-seam overflow-hidden rounded-[6px] bg-housing-850 seam">
        {LENS_ROWS.map((row) => {
          const meta = LANES.find((l) => l.key === row.lane)!;
          const run = runs[row.scenario];
          return (
            <li key={row.lane} className="grid gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[180px_minmax(0,1fr)_300px] lg:items-center lg:gap-10">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-[3px] w-7 rounded-full" style={{ background: meta.ink, filter: meta.key === "mandate" ? "invert(0.85)" : "brightness(1.7) saturate(1.2)" }} />
                <div>
                  <p className="font-display text-[30px] leading-none font-extrabold tracking-[0.01em] text-engrave">{meta.label}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-engrave-3">{meta.question}</p>
                </div>
              </div>
              <div>
                <p className="max-w-[64ch] text-[16px] leading-[1.6] text-engrave-2">{row.how}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
                  <span className="engraved text-[10px] text-lamp-amber">Catches</span>
                  <span className="text-engrave">{row.catches}</span>
                  {row.cite && (
                    <a href={row.cite.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-engrave-3 no-underline hover:text-engrave">
                      {row.cite.label}
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </p>
              </div>
              <figure>
                <Trace steps={run.steps} lane={row.lane} ink={meta.ink} />
                <figcaption className="mt-1.5 font-mono text-[9.5px] text-engrave-3">
                  {run.scenario.id} · {run.scenario.title.toLowerCase()}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------------ receipts */

function StaticChart({ runKey, height = 300 }: { runKey: string; height?: number }) {
  const run = useRun(runKey);
  const [ref, size] = useSize<HTMLDivElement>();
  const duration = run.steps.at(-1)!.event.at + 1200;
  const max = Math.max(...run.steps.map((s) => s.risk));
  const outcome = run.steps.find((s) => s.decision !== "allowed");
  return (
    <figure>
      <div ref={ref} className="overflow-hidden rounded-[4px] bg-housing-950 p-1 shadow-[inset_0_2px_6px_rgb(0_0_0/0.75)]" style={{ height }}>
        {size.width > 0 && (
          <Recorder steps={run.steps} mode="fit" width={size.width - 8} height={height - 8} duration={duration} getTime={() => duration} staticTime={duration} compact labelWidth={62} ariaLabel={`${run.scenario.title}: peak risk ${max}`} />
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-cond text-[19px] font-semibold text-engrave">{run.scenario.title}</span>
        <span className={cn("font-mono text-[12px] tabular", max >= 45 ? "text-lamp-red" : "text-lamp-green")}>
          peak risk {max} · {outcome ? DECISION_LABEL[outcome.decision].toLowerCase() : "no intervention"}
        </span>
      </figcaption>
    </figure>
  );
}

function DriftChart() {
  const run = useRun("slow-drift");
  const days = useMemo(() => {
    const byDay = new Map<number, Assessment>();
    for (const s of run.steps) if (s.event.day && s.drift && s.event.kind === "read" && s.event.dataClass === "supplier") byDay.set(s.event.day, s);
    return [...byDay.entries()].map(([day, s]) => ({ day, rolling: s.drift!.zRolling, cusum: s.drift!.cusum, anchored: s.drift!.zAnchored }));
  }, [run]);
  const W = 640;
  const H = 260;
  const pad = { l: 44, r: 18, t: 18, b: 34 };
  const yMax = Math.max(DRIFT_H * 1.6, ...days.map((d) => d.cusum));
  const x = (d: number) => pad.l + ((d - 1) / Math.max(1, days.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (Math.max(0, v) / yMax) * (H - pad.t - pad.b);
  const line = (key: "rolling" | "cusum") => days.map((d, i) => `${i ? "L" : "M"}${x(d.day).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");
  const fired = days.find((d) => d.cusum > DRIFT_H);
  const maxRolling = Math.max(...days.map((d) => d.rolling));
  return (
    <figure className="paper-grid rounded-[3px] p-4 shadow-[0_18px_40px_-22px_rgb(0_0_0/0.85)] sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Ten days of slow drift. The rolling z-score peaks at ${maxRolling.toFixed(1)} and never reaches 3; the anchored drift budget is spent on day ${fired?.day ?? "none"}.`}>
        {[0, 3, DRIFT_H].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === DRIFT_H ? "var(--color-ink-graphite)" : "var(--color-ink-blue)"} strokeDasharray={v === 0 ? undefined : "5 3"} strokeOpacity={v === 0 ? 0.5 : 0.8} />
            {v > 0 && (
              <text x={W - pad.r} y={y(v) - 5} textAnchor="end" className="printed" fontSize={10} fill={v === DRIFT_H ? "var(--color-ink-graphite)" : "var(--color-ink-blue)"}>
                {v === DRIFT_H ? `drift budget ${DRIFT_H}` : "rolling alarm z = 3"}
              </text>
            )}
          </g>
        ))}
        {days.map((d) => (
          <text key={d.day} x={x(d.day)} y={H - 12} textAnchor="middle" className="font-mono" fontSize={10} fill="var(--color-ink-graphite)">
            d{d.day}
          </text>
        ))}
        <path d={line("rolling")} fill="none" stroke="var(--color-ink-blue)" strokeWidth={2} />
        <path d={line("cusum")} fill="none" stroke="var(--color-ink-black)" strokeWidth={2.4} />
        {days.map((d) => (
          <circle key={d.day} cx={x(d.day)} cy={y(d.cusum)} r={3} fill={d.cusum > DRIFT_H ? "var(--color-ink-red)" : "var(--color-ink-black)"} />
        ))}
        {fired && (
          <g transform={`translate(${x(fired.day) - 12},${y(fired.cusum) - 16}) rotate(-6)`}>
            <rect x={-92} y={-17} width={96} height={22} fill="none" stroke="var(--color-ink-red)" strokeWidth={2} rx={2} />
            <text x={-86} y={-1} fontFamily="var(--font-display)" fontWeight={800} fontSize={14} letterSpacing="0.06em" fill="var(--color-ink-red)">
              BUDGET SPENT
            </text>
          </g>
        )}
        <text x={pad.l} y={pad.t - 4} className="printed" fontSize={10} fill="var(--color-ink-black)">
          anchored CUSUM
        </text>
      </svg>
      <figcaption className="mt-2 text-[14px] leading-relaxed text-ink-black">
        Supplier records harvested a little more each day, split into reads small enough to look ordinary. A rolling baseline peaks at z = {maxRolling.toFixed(1)} and never alarms. The anchored budget is spent on day {fired?.day ?? "—"}.
      </figcaption>
    </figure>
  );
}

export function ReceiptsSection() {
  return (
    <Section
      title="Legitimate change carries a receipt."
      lead={<p>Models, prompts and tools change every week, and a static baseline would scream at each release. The Change Ledger reads deploy events, prompt versions, tool-definition hashes and owner-signed amendments. A change with a receipt widens the baseline. The same change without one is what an attacker’s change looks like.</p>}
    >
      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <StaticChart runKey="legit-deploy" />
        <StaticChart runKey="unreceipted-deploy" />
      </div>
      <div className="mt-24 grid items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <h3 className="font-display text-[clamp(2rem,3.4vw,3rem)] leading-[0.95] font-extrabold text-engrave">A rolling baseline follows the attacker. An anchor doesn’t.</h3>
          <p className="mt-5 max-w-[48ch] text-[16.5px] leading-[1.65] text-engrave-2">The Self lens may adapt, but never outside the Mandate Card. Drift is scored against the baseline that was signed with it, and every small deviation spends from one budget.</p>
        </div>
        <DriftChart />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ ladder */

const LADDER_OPTIONS = RUNGS.map((r) => ({ value: r, label: r === "approval" ? "Approve" : r === "scope" ? "Scope" : r === "sandbox" ? "Sandbox" : r === "revoke" ? "Revoke" : "Observe", tone: r === "revoke" ? ("danger" as const) : r === "observe" ? ("plain" as const) : ("warn" as const) }));

export function LadderSection() {
  const [policy, setPolicy] = useState<Rung>("sandbox");
  const outcomes = useMemo(
    () =>
      Object.fromEntries(
        RUNGS.map((r) => {
          const run = runScenario(scenarioByKey("poisoned-pdf"), r);
          const leak = firstLeakAttempt(run.steps);
          const prs = run.steps.filter((s) => s.event.tool === "erp.create_purchase_request");
          const firstStop = run.steps.find((s) => s.decision !== "allowed");
          const canary = run.steps.some((s) => s.factors.some((f) => f.key.startsWith("mandate:canary")));
          return [r, { leaked: !leak || leak.decision === "allowed", prsDone: prs.filter((s) => s.decision === "allowed").length, prsTotal: prs.length, firstStop, canary, peak: Math.max(...run.steps.map((s) => s.risk)) }];
        }),
      ) as Record<Rung, { leaked: boolean; prsDone: number; prsTotal: number; firstStop?: Assessment; canary: boolean; peak: number }>,
    [],
  );
  const o = outcomes[policy];
  const [revoked, setRevoked] = useState(false);
  return (
    <Section
      id="containment"
      title="Contain the risk. Keep the work."
      lead={<p>Most tools stop at alert or block, and a false block stops purchase orders. MANDATE picks the lowest rung that holds the risk. Turn the selector to set how far it may go on its own, and the poisoned-PDF case re-runs under that policy.</p>}
    >
      <div className="mt-14 grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16">
        <div className="panel hammertone flex flex-col items-center px-6 py-8">
          <p className="engraved mb-5 text-[10px]">Auto-contain up to</p>
          <Detent options={LADDER_OPTIONS} value={policy} onChange={setPolicy} label="Auto-contain up to" size={196} />
          <dl className="mt-8 grid w-full grid-cols-2 gap-px overflow-hidden rounded-[4px] bg-seam seam">
            <Readout label="Data left the network" value={o.leaked ? "Yes" : "No"} bad={o.leaked} />
            <Readout label="Purchase requests" value={`${o.prsDone} of ${o.prsTotal} raised`} bad={o.prsDone < o.prsTotal} />
            <Readout label="First intervention" value={o.firstStop ? `T${o.firstStop.event.seq}` : "None"} bad={!o.firstStop} />
            <Readout label="Canary caught" value={o.canary ? "Yes" : "No"} />
          </dl>
        </div>
        <ol className="divide-y divide-seam overflow-hidden rounded-[6px] bg-housing-850 seam">
          {RUNGS.map((r) => {
            const active = RUNGS.indexOf(r) <= RUNGS.indexOf(policy);
            return (
              <li key={r} className={cn("grid gap-3 px-5 py-5 transition-colors sm:grid-cols-[200px_minmax(0,1fr)] sm:px-7", r === policy && "bg-housing-800")}>
                <div className="flex items-center gap-3">
                  <Lamp on={active} tone={r === "observe" ? "green" : r === "revoke" ? "red" : "amber"} />
                  <span className={cn("font-cond text-[19px] font-semibold", active ? "text-engrave" : "text-engrave-3")}>{RUNG_LABEL[r]}</span>
                </div>
                <p className={cn("text-[15.5px] leading-relaxed", active ? "text-engrave-2" : "text-engrave-3")}>{RUNG_DOES[r]}</p>
              </li>
            );
          })}
          <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7">
            <p className="max-w-[44ch] text-[14.5px] leading-relaxed text-engrave-3">Revoking is never automatic for a recommendation alone. It takes a held hand on the switch.</p>
            <HoldButton
              holdTime={1600}
              backgroundColor="#3a1d1a"
              fillColor="#c42318"
              textColor="#ff8a7d"
              fillTextColor="#fff4f2"
              radius={5}
              wave={false}
              glow={false}
              size="md"
              resetAfter={2600}
              doneLabel="PRC-01 token revoked"
              onHold={() => setRevoked(true)}
              className="font-cond tracking-[0.1em] uppercase"
            >
              Hold to revoke PRC-01
            </HoldButton>
            {revoked && <span className="sr-only" role="status">Demonstration only: PRC-01 token revoked.</span>}
          </li>
        </ol>
      </div>
    </Section>
  );
}

function Readout({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="bg-housing-900 px-3 py-3">
      <dt className="engraved text-[9px] leading-tight">{label}</dt>
      <dd className={cn("mt-1 font-cond text-[16px] font-semibold tabular", bad ? "text-lamp-red" : "text-engrave")}>{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ mandate card */

export function MandateCardSection() {
  const card = useMemo(() => baseMandates()["PRC-01"], []);
  const rows: [string, ReactNode][] = [
    ["Purpose", card.purpose],
    ["Tools", card.tools.join(", ")],
    ["Data classes", card.dataClasses.join(", ")],
    ["Destinations", card.destinations.join(", ")],
    ["May delegate to", card.mayDelegateTo.length ? card.mayDelegateTo.join(", ") : "No one"],
    ["Limits", `${card.limits.maxRecordsPerRead} records per read · ${card.limits.maxBytesOut / 1000} KB out per call`],
  ];
  return (
    <Section
      id="mandate"
      title="The role, written down and signed."
      lead={<p>Today a role is a name and a permissions list. The Mandate Card turns “Procurement Agent” into something a gateway can check. It is the anchor every other lens is measured against.</p>}
    >
      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <Sheet className="mx-auto w-full max-w-[680px] -rotate-[0.6deg]">
          <div className="px-6 pt-4 pb-7 sm:px-9">
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink-black pb-4">
              <div>
                <p className="printed text-[10.5px]">Mandate Card · {card.agent}</p>
                <p className="mt-1 font-display text-[40px] leading-none font-extrabold text-ink-black">{card.role}</p>
              </div>
              <div className="text-right font-mono text-[10.5px] leading-relaxed text-ink-graphite">
                <p>version {card.version}</p>
                <p>fingerprint {card.fingerprint}</p>
              </div>
            </div>
            <dl className="divide-y divide-grid-minor">
              {rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
                  <dt className="printed pt-0.5 text-[10.5px]">{k}</dt>
                  <dd className={cn("text-[15px] leading-snug text-ink-black", k !== "Purpose" && "font-mono text-[12px] leading-relaxed")}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex items-end justify-between gap-6">
              <div>
                <p className="font-cond text-[22px] font-semibold text-ink-blue italic">{card.signedBy}</p>
                <p className="mt-0.5 w-56 border-t border-ink-black pt-1 printed text-[9.5px]">Signed by the owner · {card.signedAt}</p>
              </div>
              <span className="stamp -rotate-6 text-[15px]">Enforced</span>
            </div>
          </div>
        </Sheet>
        <ol className="space-y-8">
          {[
            ["Drafted", "An LLM reads the agent’s system prompt, its tools and its template once, and drafts the card in minutes."],
            ["Signed", "The business owner reads it, edits it in place and signs it. Every later amendment writes its own receipt to the Change Ledger."],
            ["Enforced", "At runtime the gateway checks each call against the card with plain rules. There is no model in the decision path to inject."],
          ].map(([h, p], i) => (
            <li key={h} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
              <span className="seam flex size-11 items-center justify-center rounded-full bg-housing-800 font-mono text-[13px] text-lamp-amber" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <p className="font-cond text-[22px] font-semibold text-engrave">{h}</p>
                <p className="mt-1 text-[16px] leading-relaxed text-engrave-2">{p}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ calibration */

const VECTOR_LABEL: Record<string, string> = {
  injection: "Indirect prompt injection",
  unreceipted_change: "Unreceipted change",
  rug_pull: "Tool rug pull",
  stolen_token: "Stolen token",
  chain: "Agent-to-agent spread",
  slow_drift: "Slow drift",
};

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

export function CalibrationSection() {
  const [report, setReport] = useState<EvalReport | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setReport(evaluate()), 60);
    return () => clearTimeout(id);
  }, []);
  return (
    <Section
      id="evidence"
      title="Calibrated in your browser, not on a slide."
      lead={
        <p>
          This certificate was computed a moment ago on this page. The suite jitters every attack case into variants, adds held-out benign sessions from every agent, and scores the lot with the same engine that drives the chart. It proves the rules behave as designed. It is not a real-world accuracy figure: the AgentDojo benchmark has <strong className="font-semibold text-engrave">not yet been measured</strong>.
        </p>
      }
    >
      <Sheet className="mt-14">
        <div className="px-5 pt-4 pb-8 sm:px-9">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink-black pb-4">
            <div>
              <p className="printed text-[10.5px]">Calibration certificate · synthetic suite · seed {report?.seed ?? "…"}</p>
              <p className="mt-1 font-display text-[34px] leading-none font-extrabold text-ink-black">Contained before data left</p>
            </div>
            <p className="font-mono text-[11px] text-ink-graphite">{report ? `${report.attackSessions} attack + ${report.benignSessions} benign sessions · ${Math.round(report.ms)} ms` : "running…"}</p>
          </div>
          {report ? (
            <>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="printed text-[10.5px]">
                      <th className="py-3 pr-3 font-semibold">Vector</th>
                      <th className="px-3 py-3 text-right font-semibold">Sessions</th>
                      <th className="px-3 py-3 text-right font-semibold">Alerted</th>
                      <th className="px-3 py-3 text-right font-semibold">Contained in time</th>
                      <th className="py-3 pl-3 text-right font-semibold">Steps to act</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[13px] tabular text-ink-black">
                    {report.byVector.map((v) => (
                      <tr key={v.vector} className="border-t border-grid-minor">
                        <td className="py-3 pr-3 font-cond text-[16px] font-semibold">{VECTOR_LABEL[v.vector] ?? v.vector}</td>
                        <td className="px-3 py-3 text-right">{v.sessions}</td>
                        <td className="px-3 py-3 text-right">{v.detected}</td>
                        <td className={cn("px-3 py-3 text-right", v.containedBeforeLeak < v.sessions && "font-semibold text-ink-red")}>{v.containedBeforeLeak}</td>
                        <td className="py-3 pl-3 text-right">{v.vector === "slow_drift" ? `day ${v.meanStepsToContain.toFixed(1)}` : v.meanStepsToContain.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="mt-6 grid gap-px overflow-hidden rounded-[3px] border border-paper-edge bg-paper-edge sm:grid-cols-4">
                {[
                  ["Contained in time", pct(report.containedRate)],
                  ["False alerts, benign", pct(report.falseAlertRate)],
                  ["Benign sessions disrupted", pct(report.disruptionRate)],
                  ["In-role work kept flowing", pct(report.utilityKept)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-paper px-4 py-3">
                    <dt className="printed text-[9.5px]">{k}</dt>
                    <dd className="mt-1 font-mono text-[20px] font-semibold text-ink-black tabular">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 max-w-[78ch] text-[14px] leading-relaxed text-ink-black">
                <DriftNote report={report} /> Benign sessions come from the same generator that builds the baselines, which flatters the false-alert rate; real traffic will be noisier.
              </p>
            </>
          ) : (
            <p className="py-10 font-mono text-[12px] text-ink-graphite">Running the suite…</p>
          )}
        </div>
      </Sheet>
    </Section>
  );
}

function DriftNote({ report }: { report: EvalReport }) {
  const missed = report.byVector.some((v) => v.containedBeforeLeak < v.sessions);
  const caught = report.driftBoundary.filter((r) => r.day !== null);
  const slowest = caught[0];
  const fastest = caught.at(-1);
  if (!slowest || !fastest) return null;
  const pct = (g: number) => Math.round((g - 1) * 100);
  return (
    <>
      {missed && "Read the red cell honestly. "}
      Measured on this page: drift growing slower than {pct(slowest.growth)} percent a day did not spend the budget within ten simulated days; {pct(slowest.growth)} percent is caught on day {slowest.day}, {pct(fastest.growth)} percent by day {fastest.day}.
    </>
  );
}

/* ------------------------------------------------------------------ context */

const FACTS = [
  {
    stat: "80%",
    text: "of companies say their AI agents have taken unintended actions; 39% say agents reached systems or resources they were not authorised for.",
    source: "SailPoint, AI agent adoption research, 2025",
    url: "https://www.sailpoint.com/press-releases/sailpoint-ai-agent-adoption-report",
  },
  {
    stat: "97%",
    text: "of organisations that reported a breach of AI models or applications lacked proper AI access controls. Those organisations were 13% of the study.",
    source: "IBM, Cost of a Data Breach Report 2025",
    url: "https://www.ibm.com/reports/data-breach",
  },
  {
    stat: "ASI01",
    text: "Agent Goal Hijack heads OWASP’s Top 10 for Agentic Applications: an agent redirected by content it reads, while it believes it is still serving its user.",
    source: "OWASP GenAI Security Project, December 2025",
    url: "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
  },
];

export function ContextSection() {
  return (
    <Section width="narrow" title="Agents already hold the keys.">
      <ul className="mt-12 divide-y divide-seam border-y border-seam">
        {FACTS.map((f) => (
          <li key={f.stat} className="grid gap-4 py-8 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-10">
            <p className="font-display text-[52px] leading-none font-extrabold text-engrave">{f.stat}</p>
            <div>
              <p className="max-w-[60ch] text-[18px] leading-[1.55] text-engrave">{f.text}</p>
              <a href={f.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13.5px] text-engrave-3 no-underline hover:text-engrave">
                {f.source}
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ limits */

export function LimitsSection() {
  const residual = useRun("inside-mandate");
  const peak = Math.max(...residual.steps.map((s) => s.risk));
  const slowPct = useMemo(() => {
    const first = driftBoundary().find((r) => r.day !== null);
    return first ? Math.round((first.growth - 1) * 100) : "—";
  }, []);
  const items = [
    ["It only sees what crosses the gateway.", "Agents that call tools directly need SDK instrumentation before MANDATE can read their trace."],
    ["A human signs each Mandate Card once.", "Drafting is automatic and takes minutes, but the owner’s signature is the point, and it is a step."],
    [`Misuse inside the role scores low: ${peak} in case SCN-09.`, "An attacker who only touches data the role allows, through the channel it always uses, leaves only an encoded payload as a tell. Honeytokens and the drift budget narrow this gap; they do not close it."],
    [`Very slow drift outlasts a ten-day window.`, `Harvesting that grows by less than ${slowPct} percent a day had not spent the drift budget after ten simulated days (computed on this page). A longer window or a tighter budget catches it later, at the price of more alerts.`],
    ["The numbers on this page are synthetic.", "Every chart and certificate is computed from seeded, labelled synthetic telemetry. Real-traffic and AgentDojo results are not yet measured."],
  ];
  return (
    <Section width="narrow" title="What it can’t do yet.">
      <ul className="mt-12 space-y-8">
        {items.map(([h, p]) => (
          <li key={h} className="grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-10">
            <p className="font-cond text-[21px] leading-snug font-semibold text-engrave">{h}</p>
            <p className="text-[16px] leading-relaxed text-engrave-2">{p}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ close */

export function CloseSection() {
  return (
    <section className="relative border-t border-seam bg-housing-950 px-4 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto flex max-w-[1360px] flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="max-w-[16ch] font-display text-[clamp(2.8rem,6vw,5.25rem)] leading-[0.9] font-extrabold text-engrave">Load a case. Try to get something past it.</h2>
        <div className="flex flex-col items-start gap-4">
          <Link to="/console" className="key h-14 bg-lamp-amber px-6 text-[14px] text-housing-950 no-underline shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-2px_0_rgb(0_0_0/0.25),0_0_0_1px_rgb(0_0_0/0.65),0_6px_18px_-6px_rgb(255_181_71/0.55)] hover:bg-[#ffc266]">
            <Play className="size-4" strokeWidth={2.4} aria-hidden="true" />
            Open the live console
          </Link>
          <p className="max-w-[40ch] text-[14px] leading-relaxed text-engrave-3">Nine cases, eight agents, every lens and the full response ladder. Runs entirely in your browser.</p>
        </div>
      </div>
      <footer className="mx-auto mt-24 flex max-w-[1360px] flex-wrap items-center justify-between gap-4 border-t border-seam pt-6">
        <span className="seam rounded-[3px] bg-housing-800 px-2.5 py-1 font-display text-[16px] leading-none font-extrabold tracking-[0.2em] text-engrave">MANDATE</span>
        <p className="engraved text-[10px]">Research prototype · synthetic data · problem statement “Identity Drift Detection in Autonomous AI Agents”</p>
      </footer>
    </section>
  );
}
