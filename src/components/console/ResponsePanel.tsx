import HoldButton from "@/components/HoldButton";
import { Detent } from "@/components/recorder/parts";
import { RUNGS, type Assessment, type Rung } from "@/engine/types";
import { RUNG_DOES, RUNG_LABEL } from "@/lib/lenses";
import { cn } from "@/lib/utils";
import { useConsole, type ComputedRun } from "@/state/console";

const OPTIONS = RUNGS.filter((r) => r !== "revoke").map((r) => ({
  value: r,
  label: r === "approval" ? "Approve" : r === "scope" ? "Scope" : r === "sandbox" ? "Sandbox" : "Observe",
  tone: r === "observe" ? ("plain" as const) : ("warn" as const),
}));

export function ResponsePanel({ run, current }: { run: ComputedRun; current?: Assessment }) {
  const policy = useConsole((s) => s.policy);
  const setPolicy = useConsole((s) => s.setPolicy);
  const actions = useConsole((s) => s.actions);
  const addAction = useConsole((s) => s.addAction);
  const clearActions = useConsole((s) => s.clearActions);
  const index = useConsole((s) => s.index);
  const nextIndex = Math.min(run.steps.length - 1, index + 1);
  const session = current?.event.session ?? run.scenario.events[0].session;
  const agent = current?.event.agent ?? run.scenario.agent;
  const revoked = current?.rung === "revoke";
  const atEnd = index >= run.steps.length - 1;

  const escalate = (rung: Rung) => addAction({ index: nextIndex, session, rung });

  return (
    <section aria-labelledby="response-title" className="panel hammertone px-5 pt-4 pb-5">
      <h2 id="response-title" className="engraved text-[10px]">
        Response
      </h2>
      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
        <Detent options={OPTIONS} value={policy === "revoke" ? "sandbox" : policy} onChange={(v) => setPolicy(v)} label="Auto-contain up to" size={136} marker={current?.recommended === "revoke" ? undefined : current?.recommended} />
        <div>
          <p className="engraved text-[9.5px]">Auto-contain up to</p>
          <p className="mt-1 font-cond text-[19px] leading-tight font-semibold text-engrave">{RUNG_LABEL[policy]}</p>
          <p className="mt-1.5 text-[13px] leading-snug text-engrave-2">{RUNG_DOES[policy]}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-seam pt-4">
        <p className="engraved text-[9.5px]">Analyst override for {agent} from step T{run.steps[nextIndex]?.event.seq ?? "—"}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(["approval", "scope", "sandbox"] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={atEnd || revoked}
              onClick={() => escalate(r)}
              className={cn("key h-8 px-2.5 text-[10px] bg-housing-700 text-engrave shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(0_0_0/0.7)] hover:bg-housing-600 disabled:cursor-not-allowed disabled:opacity-40")}
            >
              {RUNG_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <HoldButton
            key={`${run.scenario.key}-${actions.length}`}
            holdTime={1400}
            backgroundColor="#3a1d1a"
            fillColor="#c42318"
            textColor="#ff8a7d"
            fillTextColor="#fff4f2"
            radius={5}
            wave={false}
            glow={false}
            size="md"
            resetAfter={0}
            disabled={atEnd || revoked}
            doneLabel={`${agent} revoked from T${run.steps[nextIndex]?.event.seq}`}
            onHold={() => escalate("revoke")}
            className="w-full font-cond tracking-[0.1em] uppercase"
          >
            {revoked ? `${agent} token revoked` : `Hold to revoke ${agent}`}
          </HoldButton>
        </div>
        {actions.length > 0 && (
          <div className="mt-3 flex items-start justify-between gap-3">
            <ul className="space-y-0.5 font-mono text-[10px] text-engrave-2">
              {actions.map((a) => (
                <li key={`${a.index}-${a.session}`}>
                  T{run.steps[a.index]?.event.seq} · {run.scenario.events.find((e) => e.session === a.session)?.agent ?? a.session} → {RUNG_LABEL[a.rung].toLowerCase()}
                </li>
              ))}
            </ul>
            <button type="button" onClick={clearActions} className="engraved shrink-0 text-[9.5px] text-engrave-3 hover:text-engrave">
              Clear
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
