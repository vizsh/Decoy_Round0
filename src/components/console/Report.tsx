import Counter from "@/components/Counter";
import { LENS_CAP } from "@/engine/engine";
import { RUNG_FLOOR, RUNGS, type Assessment, type Factor, type Lens } from "@/engine/types";
import { DRIFT_H } from "@/engine/baseline";
import { DECISION_LABEL, LENS_INK, LENS_LABEL, RUNG_LABEL } from "@/lib/lenses";
import { cn } from "@/lib/utils";
import type { ComputedRun } from "@/state/console";

const ORDER: Lens[] = ["mandate", "story", "taint", "chain", "self", "herd", "drift"];

export function Report({ run, current, scrubbing }: { run: ComputedRun; current?: Assessment; scrubbing: boolean }) {
  if (!current) {
    return (
      <section aria-label="Examiner's report" className="paper rounded-[3px] px-5 py-6 shadow-[0_18px_36px_-20px_rgb(0_0_0/0.9)]">
        <p className="printed text-[10.5px]">Examiner’s report</p>
        <p className="mt-3 font-cond text-[20px] font-semibold text-ink-black">Waiting for the first event.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-graphite">Press Run, or step forward with the arrow keys.</p>
      </section>
    );
  }
  const s = current;
  const byLens = new Map<Lens, Factor[]>();
  for (const f of s.factors) byLens.set(f.lens, [...(byLens.get(f.lens) ?? []), f]);
  const lensTotals = ORDER.map((l) => {
    const raw = (byLens.get(l) ?? []).reduce((a, f) => a + f.points, 0);
    return { lens: l, raw, capped: Math.min(raw, LENS_CAP[l]) };
  }).filter((x) => x.raw > 0);
  const sum = lensTotals.reduce((a, x) => a + x.capped, 0);
  const escalate = RUNGS.indexOf(s.recommended) > RUNGS.indexOf(s.rung);
  const evidence = new Map(run.steps.map((x) => [x.event.id, x.event]));

  return (
    <section aria-label="Examiner's report" aria-live={scrubbing ? "off" : "polite"} className="paper relative rounded-[3px] shadow-[0_18px_36px_-20px_rgb(0_0_0/0.9)]">
      <div className="border-b-2 border-ink-black px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="printed text-[10.5px]">Examiner’s report{scrubbing && " · reading"}</p>
          <p className="font-mono text-[10px] text-ink-graphite">
            T{s.event.seq} · {s.event.agent}
          </p>
        </div>
        <p className="mt-1.5 font-cond text-[17px] leading-snug font-semibold text-ink-black">{s.event.summary}</p>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 px-5 pt-4">
        <div className="seam rounded-[3px] bg-housing-950 px-2.5 py-1.5">
          <Counter value={s.risk} minDigits={3} fontSize={38} fontWeight={600} textColor={s.risk >= RUNG_FLOOR.scope ? "var(--color-lamp-red)" : s.risk >= RUNG_FLOOR.approval ? "var(--color-lamp-amber)" : "var(--color-lamp-green)"} className="font-mono" intro={false} />
        </div>
        <div>
          <p className="printed text-[9.5px]">Applied</p>
          <p className={cn("font-cond text-[21px] leading-tight font-bold", s.rung === "observe" ? "text-ink-green" : "text-ink-red")}>{RUNG_LABEL[s.rung]}</p>
          {escalate && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-red">Recommends {RUNG_LABEL[s.recommended].toLowerCase()} · needs a human</p>}
        </div>
      </div>

      <ol className="mx-5 mt-4 grid grid-cols-3 overflow-hidden rounded-[3px] border border-ink-black" aria-label="Story stages">
        {(["taint", "reach", "leak"] as const).map((st, i) => {
          const on = s.stages.includes(st);
          return (
            <li key={st} className={cn("px-2 py-1.5 text-center", i > 0 && "border-l border-ink-black", on ? "bg-ink-red text-paper" : "text-ink-graphite")}>
              <span className="font-display text-[15px] font-extrabold tracking-[0.06em] uppercase">{st}</span>
            </li>
          );
        })}
      </ol>

      <dl className="mx-5 mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
        <dt className="printed text-[9.5px]">IAM</dt>
        <dt className="printed text-[9.5px]">Mandate gateway</dt>
        <dd className="font-mono text-[12px] text-ink-black">{s.iam === "allow" ? "ALLOW" : "DENY"}</dd>
        <dd className={cn("font-mono text-[12px]", s.decision !== "allowed" ? "font-semibold text-ink-red" : "text-ink-black")}>{DECISION_LABEL[s.decision].toUpperCase()}</dd>
      </dl>
      {s.note && <p className="mx-5 mt-1.5 text-[13px] leading-snug text-ink-black">{s.note}</p>}

      <div className="mt-4 border-t border-paper-edge px-5 pt-3 pb-4">
        <p className="printed text-[10px]">
          Why · {s.factors.filter((f) => f.points > 0).length} named factors
          {s.factors.some((f) => f.waivedBy) && ` · ${s.factors.filter((f) => f.waivedBy).length} waived by receipts`}
        </p>
        {s.factors.length === 0 && <p className="mt-2 text-[14px] text-ink-graphite">Nothing outside the mandate or the baselines so far.</p>}
        <ul className="mt-2 space-y-2.5">
          {ORDER.flatMap((l) => byLens.get(l) ?? []).map((f) => (
            <FactorRow key={f.key} f={f} fresh={s.newFactors.includes(f.key)} evidenceSeqs={f.evidence.map((id) => evidence.get(id)?.seq).filter((n): n is number => n !== undefined)} />
          ))}
        </ul>
        {lensTotals.length > 0 && (
          <div className="mt-4 rounded-[3px] bg-paper-2 px-3 py-2.5">
            <p className="font-mono text-[10.5px] leading-relaxed text-ink-black">
              {lensTotals.map((x, i) => (
                <span key={x.lens}>
                  {i > 0 && " + "}
                  <span style={{ color: LENS_INK[x.lens] }}>{LENS_LABEL[x.lens]}</span> {x.capped}
                  {x.raw > x.capped && <span className="text-ink-graphite"> (cap {LENS_CAP[x.lens]})</span>}
                </span>
              ))}{" "}
              = {sum}
              {sum > 100 && " → capped at 100"}
            </p>
          </div>
        )}
      </div>

      {s.passport && (
        <div className="border-t border-paper-edge px-5 py-3">
          <p className="printed text-[10px]">Delegation passport</p>
          <dl className="mt-1.5 grid grid-cols-[86px_minmax(0,1fr)] gap-y-1 text-[12.5px] text-ink-black">
            <dt className="text-ink-graphite">Origin</dt>
            <dd>{s.passport.origin}</dd>
            <dt className="text-ink-graphite">Hops</dt>
            <dd className="font-mono text-[11px]">{[...s.passport.hops, s.event.agent].join(" → ")}</dd>
            <dt className="text-ink-graphite">Taint</dt>
            <dd className={s.passport.tainted ? "text-ink-red" : undefined}>{s.passport.tainted ? "Carried across the hop" : "Clean"}</dd>
            <dt className="text-ink-graphite">Authority</dt>
            <dd className="font-mono text-[11px]">{s.passport.authority.length ? s.passport.authority.join(", ") : "none (shrunk to nothing)"}</dd>
          </dl>
        </div>
      )}

      {s.drift && s.drift.cusum > 0.5 && <DriftTrace run={run} current={s} />}
    </section>
  );
}

function DriftTrace({ run, current }: { run: ComputedRun; current: Assessment }) {
  const upto = run.steps.indexOf(current);
  const pts = run.steps.slice(0, upto + 1).filter((x) => x.event.agent === current.event.agent).map((x) => x.drift?.cusum ?? 0);
  const W = 300;
  const H = 64;
  const max = DRIFT_H * 1.35;
  const y = (v: number) => H - 6 - (Math.min(v, max) / max) * (H - 12);
  const x = (i: number) => (pts.length < 2 ? W / 2 : 6 + (i / (pts.length - 1)) * (W - 12));
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const drift = current.drift!;
  return (
    <div className="border-t border-paper-edge px-5 py-3">
      <p className="printed text-[10px]">Drift budget · {drift.dataClass}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="paper-grid mt-2 block w-full rounded-[2px]" role="img" aria-label={`Drift budget ${drift.cusum.toFixed(1)} of ${DRIFT_H}${drift.exceeded ? ", spent" : ""}`}>
        <line x1={0} x2={W} y1={y(DRIFT_H)} y2={y(DRIFT_H)} stroke="var(--color-ink-graphite)" strokeDasharray="6 3" />
        <text x={W - 4} y={y(DRIFT_H) - 4} textAnchor="end" className="printed halo" fontSize={9} fill="var(--color-ink-graphite)">
          budget {DRIFT_H}
        </text>
        <path d={d} fill="none" stroke={drift.exceeded ? "var(--color-ink-red)" : "var(--color-ink-graphite)"} strokeWidth={1.8} strokeLinejoin="round" />
        <circle cx={x(pts.length - 1)} cy={y(pts.at(-1) ?? 0)} r={2.6} fill={drift.exceeded ? "var(--color-ink-red)" : "var(--color-ink-black)"} />
      </svg>
      <p className="mt-1.5 font-mono text-[10.5px] text-ink-black">
        CUSUM {drift.cusum.toFixed(1)} of {DRIFT_H} · anchored z {drift.zAnchored.toFixed(1)} · rolling z {drift.zRolling.toFixed(1)}
      </p>
    </div>
  );
}

function FactorRow({ f, fresh, evidenceSeqs }: { f: Factor; fresh: boolean; evidenceSeqs: number[] }) {
  const waived = !!f.waivedBy;
  const inferred = f.certainty === "inferred";
  return (
    <li className={cn("grid grid-cols-[38px_minmax(0,1fr)] gap-x-2", waived && "opacity-70")}>
      <span className={cn("pt-px text-right font-mono text-[12px] font-semibold tabular", waived ? "text-ink-green line-through" : "text-ink-red")}>+{waived ? 0 : f.points}</span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] leading-snug text-ink-black">
          <span className={cn("font-cond font-semibold", waived && "line-through decoration-ink-green")}>{f.label}</span>
          <span className="font-mono text-[9px] tracking-wide uppercase" style={{ color: LENS_INK[f.lens] }}>
            {LENS_LABEL[f.lens]}
          </span>
          {fresh && <span className="font-mono text-[9px] text-ink-red uppercase">new</span>}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-graphite">{f.detail}</p>
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-[5px] rounded-full"
            style={{
              width: `${Math.max(4, Math.min(100, f.points * 2.2))}%`,
              background: inferred ? "transparent" : LENS_INK[f.lens],
              border: inferred ? `1px dashed ${LENS_INK[f.lens]}` : undefined,
            }}
          />
          <span className={cn("font-mono text-[9px] text-ink-graphite", inferred && "italic")}>
            {waived ? `waived by receipt ${f.waivedBy}` : `${f.certainty}${evidenceSeqs.length ? ` · T${evidenceSeqs.join(", T")}` : ""}`}
          </span>
        </div>
      </div>
    </li>
  );
}
