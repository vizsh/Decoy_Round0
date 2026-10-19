import { Lamp } from "@/components/recorder/parts";
import { SCENARIOS } from "@/engine/scenarios";
import { AGENTS } from "@/engine/world";
import { cn } from "@/lib/utils";
import { useConsole, type ComputedRun } from "@/state/console";

const VECTOR: Record<string, string> = {
  injection: "Prompt injection",
  legit_change: "Sanctioned change",
  unreceipted_change: "Unreceipted change",
  rug_pull: "Tool rug pull",
  stolen_token: "Stolen token",
  chain: "Agent chain",
  slow_drift: "Slow drift",
  residual: "Residual risk",
};

export function CaseRack({ run }: { run: ComputedRun }) {
  const scenarioKey = useConsole((s) => s.scenarioKey);
  const setScenario = useConsole((s) => s.setScenario);
  const index = useConsole((s) => s.index);
  const setFocusAgent = useConsole((s) => s.setFocusAgent);
  const setView = useConsole((s) => s.setView);
  const seen = run.steps.slice(0, index + 1);
  const riskOf = (id: string) => seen.filter((s) => s.event.agent === id).reduce((m, s) => Math.max(m, s.risk), -1);

  return (
    <div className="panel hammertone flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-3">
        <h2 className="engraved px-2 text-[10px]">Cases</h2>
        <ul className="mt-2 space-y-0.5">
          {SCENARIOS.map((s) => {
            const active = s.key === scenarioKey;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setScenario(s.key)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 rounded-[4px] px-2 py-2 text-left transition-colors",
                    active ? "bg-housing-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_0_0_1px_rgb(0_0_0/0.6)]" : "hover:bg-housing-800",
                  )}
                >
                  <span className="pt-1.5">
                    <Lamp on={active} tone={s.malicious ? "red" : "green"} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("font-cond text-[14.5px] leading-tight font-semibold", active ? "text-engrave" : "text-engrave-2 group-hover:text-engrave")}>{s.title}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-[9.5px] text-engrave-3">
                      {s.id} · {VECTOR[s.vector]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <h2 className="engraved mt-6 px-2 text-[10px]">Fleet</h2>
        <ul className="mt-2 space-y-0.5">
          {AGENTS.map((a) => {
            const r = riskOf(a.id);
            const inRun = run.scenario.events.some((e) => e.agent === a.id);
            const dayZero = a.createdDaysAgo === 0 || run.scenario.dayZero?.includes(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setFocusAgent(a.id);
                    setView("mandate");
                  }}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-[4px] px-2 py-1.5 text-left hover:bg-housing-800"
                  aria-label={`${a.id} ${a.name}, ${r < 0 ? "idle" : `risk ${r}`}. Open its Mandate Card.`}
                >
                  <Lamp on={r >= 0} tone={r >= 45 ? "red" : r >= 25 ? "amber" : "green"} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] leading-tight text-engrave-2">
                      <span className="font-mono text-[10.5px] text-engrave">{a.id}</span> {a.name}
                    </span>
                    {dayZero && <span className="engraved text-[8.5px] text-lamp-amber">Day zero · no history</span>}
                  </span>
                  <span className={cn("font-mono text-[11px] tabular", r >= 45 ? "text-lamp-red" : inRun ? "text-engrave-2" : "text-engrave-3")}>{r < 0 ? "—" : String(r).padStart(3, "0")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="border-t border-seam px-5 py-3 font-mono text-[9.5px] leading-relaxed text-engrave-3">Synthetic telemetry. Every number is computed by the in-browser engine.</p>
    </div>
  );
}
