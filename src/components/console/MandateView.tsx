import { useMemo, useState } from "react";
import { Key } from "@/components/recorder/parts";
import { SENSITIVITY, type DataClass } from "@/engine/types";
import { AGENTS, agentById, TEMPLATE_UNIVERSE } from "@/engine/world";
import { cn } from "@/lib/utils";
import { useConsole, type ComputedRun } from "@/state/console";

const CLASSES = Object.keys(SENSITIVITY) as DataClass[];

export function MandateView({ run }: { run: ComputedRun }) {
  const focus = useConsole((s) => s.focusAgent);
  const setFocusAgent = useConsole((s) => s.setFocusAgent);
  const amend = useConsole((s) => s.amend);
  const amendments = useConsole((s) => s.amendments);
  const resetAmendments = useConsole((s) => s.resetAmendments);
  const agentId = focus ?? run.scenario.agent;
  const agent = agentById(agentId);
  const card = run.engine.mandates[agentId];
  const [draft, setDraft] = useState<DataClass[] | null>(null);
  const classes = draft ?? card.dataClasses;
  const dirty = draft !== null && (draft.length !== card.dataClasses.length || draft.some((c) => !card.dataClasses.includes(c)));
  const universe = TEMPLATE_UNIVERSE[agent.template];
  const seenTools = useMemo(() => [...new Set(run.scenario.events.filter((e) => e.agent === agentId && e.kind !== "change").map((e) => e.tool))], [run, agentId]);

  const toggle = (c: DataClass) => setDraft((d) => {
    const base = d ?? card.dataClasses;
    return base.includes(c) ? base.filter((x) => x !== c) : [...base, c];
  });

  const sign = () => {
    if (!draft) return;
    amend({ agent: agentId, patch: { dataClasses: draft }, receipt: { id: `R-OWN-${amendments.length + 1}`, ref: "Owner amendment signed in console", approvedBy: agent.owner } });
    setDraft(null);
  };

  return (
    <section aria-labelledby="mandate-title" className="panel hammertone p-5 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="mandate-title" className="font-display text-[28px] leading-none font-extrabold text-engrave">
            Mandate Card
          </h2>
          <p className="mt-2 max-w-[64ch] text-[14.5px] leading-relaxed text-engrave-2">
            Read it and amend it in place. Signing writes an owner receipt to the Change Ledger and re-runs the case. Adding data that no {agent.template} role should touch is allowed but flagged.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <span className="engraved text-[9.5px]">Agent</span>
          <select
            value={agentId}
            onChange={(e) => {
              setFocusAgent(e.target.value);
              setDraft(null);
            }}
            className="h-9 rounded-[4px] bg-housing-800 px-2 font-mono text-[11.5px] text-engrave shadow-[0_0_0_1px_rgb(0_0_0/0.7)] focus-visible:outline-2"
          >
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} · {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="paper mt-6 rounded-[3px] px-5 pt-5 pb-6 shadow-[0_18px_36px_-20px_rgb(0_0_0/0.9)] sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink-black pb-3">
          <div>
            <p className="printed text-[10.5px]">Mandate Card · {card.agent}</p>
            <p className="mt-1 font-display text-[34px] leading-none font-extrabold text-ink-black">{card.role}</p>
          </div>
          <div className="text-right font-mono text-[10.5px] leading-relaxed text-ink-graphite">
            <p>version {card.version} · signed {card.signedAt}</p>
            <p>by {card.signedBy}</p>
            <p>fingerprint {card.fingerprint}</p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-black">{card.purpose}</p>

        <fieldset className="mt-5">
          <legend className="printed text-[10.5px]">Data classes · tap to amend</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CLASSES.map((c) => {
              const on = classes.includes(c);
              const outside = !universe.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c)}
                  className={cn(
                    "rounded-[3px] border px-2.5 py-1 font-mono text-[11px] transition-colors",
                    on ? "border-ink-black bg-ink-black text-paper" : "border-paper-edge text-ink-graphite hover:border-ink-graphite",
                    on && outside && "border-ink-red bg-ink-red",
                  )}
                  title={outside ? `Not part of any ${agent.template} role` : undefined}
                >
                  {c}
                  <span className="ml-1 opacity-60">s{SENSITIVITY[c]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="printed text-[10px]">Tools</dt>
            <dd className="mt-1 font-mono text-[11px] leading-relaxed text-ink-black">
              {card.tools.map((t) => (
                <span key={t} className={cn("mr-2 inline-block", !seenTools.includes(t) && "text-ink-graphite")}>
                  {t}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="printed text-[10px]">Destinations</dt>
            <dd className="mt-1 font-mono text-[11px] leading-relaxed text-ink-black">{card.destinations.join(" · ")}</dd>
          </div>
          <div>
            <dt className="printed text-[10px]">May delegate to</dt>
            <dd className="mt-1 font-mono text-[11px] text-ink-black">{card.mayDelegateTo.join(", ") || "No one"}</dd>
          </div>
          <div>
            <dt className="printed text-[10px]">Limits</dt>
            <dd className="mt-1 font-mono text-[11px] text-ink-black">
              {card.limits.maxRecordsPerRead} records per read · {card.limits.maxBytesOut / 1000} KB per call
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="printed text-[10px]">IAM grant, for comparison</dt>
            <dd className="mt-1 font-mono text-[11px] text-ink-red">{agent.granted.join(" · ")}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-paper-edge pt-4">
          <p className="text-[13px] text-ink-graphite">{dirty ? "Unsigned changes. Sign to apply them and re-run the case." : amendments.length ? `${amendments.length} amendment${amendments.length > 1 ? "s" : ""} signed in this session.` : "No pending changes."}</p>
          <div className="flex gap-2">
            {(dirty || amendments.length > 0) && (
              <Key
                onClick={() => {
                  setDraft(null);
                  resetAmendments();
                }}
                className="h-9 text-[10.5px]"
              >
                Discard all
              </Key>
            )}
            <Key tone="lit" disabled={!dirty} onClick={sign} className="h-9 px-4 text-[11px] disabled:cursor-not-allowed disabled:opacity-40">
              Sign as {agent.owner}
            </Key>
          </div>
        </div>
      </div>
    </section>
  );
}
