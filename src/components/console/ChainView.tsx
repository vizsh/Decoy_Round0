import { AGENTS } from "@/engine/world";
import type { AgentId } from "@/engine/types";
import { DECISION_LABEL } from "@/lib/lenses";
import { cn } from "@/lib/utils";
import type { ComputedRun } from "@/state/console";

const POS: Record<AgentId, [number, number]> = {
  "ORC-00": [500, 70],
  "PRC-01": [110, 245],
  "HRA-02": [300, 245],
  "SUP-03": [500, 245],
  "FIN-04": [700, 245],
  "PRC-07": [890, 245],
  "LDB-06": [600, 420],
  "RPT-05": [820, 420],
};

export function ChainView({ run, index }: { run: ComputedRun; index: number }) {
  const seen = run.steps.slice(0, index + 1);
  const hops = seen.filter((s) => s.event.kind === "delegate" && s.event.delegateTo);
  const riskOf = (id: string) => seen.filter((s) => s.event.agent === id).reduce((m, s) => Math.max(m, s.risk), -1);
  const allowed: [AgentId, AgentId][] = [];
  for (const a of AGENTS) for (const t of run.engine.mandates[a.id].mayDelegateTo) allowed.push([a.id, t]);

  return (
    <section aria-labelledby="chain-title" className="panel hammertone p-5 lg:p-7">
      <h2 id="chain-title" className="font-display text-[28px] leading-none font-extrabold text-engrave">
        Delegation chain
      </h2>
      <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-engrave-2">
        Faint lines are the delegations each Mandate Card allows. Solid lines are hops observed in this case so far. Each hop carries a passport: its origin, whether it is tainted, and an authority that can only shrink.
      </p>
      <div className="mt-5 overflow-x-auto rounded-[4px] bg-housing-950 p-2 shadow-[inset_0_2px_6px_rgb(0_0_0/0.75)]">
        <svg viewBox="0 0 1000 500" className="paper-grid block w-full min-w-[640px] rounded-[2px]" role="img" aria-label={`Delegation graph with ${hops.length} observed hops`}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--color-ink-black)" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--color-ink-red)" />
            </marker>
          </defs>
          {allowed.map(([a, b]) => {
            const [x1, y1] = POS[a];
            const [x2, y2] = POS[b];
            return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink-graphite)" strokeOpacity={0.35} strokeDasharray="3 5" />;
          })}
          {hops.map((h) => {
            const [x1, y1] = POS[h.event.agent];
            const [x2, y2] = POS[h.event.delegateTo!];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            const ux = dx / len;
            const uy = dy / len;
            const bad = h.decision !== "allowed";
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            return (
              <g key={h.event.id}>
                <line x1={x1 + ux * 46} y1={y1 + uy * 30} x2={x2 - ux * 50} y2={y2 - uy * 32} stroke={bad ? "var(--color-ink-red)" : h.stages.includes("taint") ? "var(--color-ink-amber)" : "var(--color-ink-black)"} strokeWidth={2.4} markerEnd={bad ? "url(#arrow-red)" : "url(#arrow)"} />
                <g transform={`translate(${mx + 10},${my - 8})`}>
                  <rect x={-4} y={-13} width={150} height={bad ? 34 : 20} fill="var(--color-paper)" opacity={0.92} rx={2} />
                  <text className="font-mono" fontSize={10} fill="var(--color-ink-black)">
                    T{h.event.seq} asks for {(h.event.requested ?? []).join(", ") || "nothing"}
                  </text>
                  {bad && (
                    <text y={15} fontFamily="var(--font-display)" fontWeight={800} fontSize={13} letterSpacing="0.06em" fill="var(--color-ink-red)">
                      {DECISION_LABEL[h.decision].toUpperCase()}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
          {AGENTS.map((a) => {
            const [x, y] = POS[a.id];
            const r = riskOf(a.id);
            const hot = r >= 45;
            return (
              <g key={a.id} transform={`translate(${x},${y})`}>
                <rect x={-58} y={-28} width={116} height={56} rx={4} fill={hot ? "var(--color-ink-red)" : "var(--color-housing-800)"} stroke="rgb(0 0 0 / 0.7)" />
                <text y={-7} textAnchor="middle" className="font-mono" fontSize={12} fontWeight={600} fill={hot ? "var(--color-paper)" : "var(--color-engrave)"}>
                  {a.id}
                </text>
                <text y={9} textAnchor="middle" fontFamily="var(--font-cond)" fontSize={11.5} fill={hot ? "var(--color-paper)" : "var(--color-engrave-2)"}>
                  {a.name.replace(" Agent", "").replace(" (EU)", " EU")}
                </text>
                <text y={22} textAnchor="middle" className="font-mono" fontSize={9.5} fill={hot ? "var(--color-paper)" : "var(--color-engrave-3)"}>
                  {r < 0 ? "idle" : `risk ${r}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <h3 className="engraved mt-6 text-[10px]">Passports issued in this case</h3>
      {hops.length === 0 ? (
        <p className="mt-2 text-[14px] text-engrave-3">No delegation has happened yet in this case. Load SCN-06, agent-to-agent spread, to watch a passport carry taint across hops.</p>
      ) : (
        <ul className="mt-2 divide-y divide-seam overflow-hidden rounded-[4px] bg-housing-900 seam">
          {hops.map((h) => {
            const callee = run.steps.find((s) => s.event.parent === h.event.id);
            return (
              <li key={h.event.id} className="grid gap-2 px-4 py-3 text-[13.5px] sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                <span className="font-mono text-[11px] text-engrave">
                  T{h.event.seq} {h.event.agent} → {h.event.delegateTo}
                </span>
                <span className="text-engrave-2">
                  Requested <span className="font-mono text-[11px] text-engrave">{(h.event.requested ?? []).join(", ") || "nothing"}</span>
                  {callee?.passport && (
                    <>
                      {" "}· passed <span className={cn("font-mono text-[11px]", callee.passport.authority.length ? "text-engrave" : "text-lamp-red")}>{callee.passport.authority.join(", ") || "nothing"}</span> · {callee.passport.tainted ? <span className="text-lamp-amber">taint carried</span> : "clean"}
                    </>
                  )}
                </span>
                <span className={cn("font-mono text-[10.5px]", h.decision !== "allowed" ? "text-lamp-red" : "text-engrave-3")}>{DECISION_LABEL[h.decision]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
