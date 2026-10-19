import { useEffect, useMemo, useState } from "react";
import { Command as CommandIcon } from "lucide-react";
import { Lamp } from "@/components/recorder/parts";
import { stepIndexAt } from "@/components/recorder/math";
import { CaseRack } from "@/components/console/CaseRack";
import { Report } from "@/components/console/Report";
import { ResponsePanel } from "@/components/console/ResponsePanel";
import { RecorderView } from "@/components/console/RecorderView";
import { ChainView } from "@/components/console/ChainView";
import { LedgerView } from "@/components/console/LedgerView";
import { MandateView } from "@/components/console/MandateView";
import { CalibrationView } from "@/components/console/CalibrationView";
import { Palette } from "@/components/console/Palette";
import { scenarioByKey } from "@/engine/scenarios";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { clock, computeRun, useClock, useConsole, type View } from "@/state/console";
import { ArrowUpRight } from "lucide-react";

const VIEWS: { key: View; label: string }[] = [
  { key: "recorder", label: "Recorder" },
  { key: "chain", label: "Chain" },
  { key: "ledger", label: "Ledger" },
  { key: "mandate", label: "Mandate" },
  { key: "calibration", label: "Calibration" },
];

export default function Console() {
  const scenarioKey = useConsole((s) => s.scenarioKey);
  const policy = useConsole((s) => s.policy);
  const receipts = useConsole((s) => s.receipts);
  const actions = useConsole((s) => s.actions);
  const amendments = useConsole((s) => s.amendments);
  const view = useConsole((s) => s.view);
  const setView = useConsole((s) => s.setView);
  const index = useConsole((s) => s.index);
  const scrub = useConsole((s) => s.scrub);
  const scenario = scenarioByKey(scenarioKey);
  const run = useMemo(() => computeRun(scenario, policy, receipts, actions, amendments), [scenario, policy, receipts, actions, amendments]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { playing } = useClock();

  clock.duration = run.duration;

  useEffect(() => {
    document.title = `${scenario.id} ${scenario.title} · MANDATE console`;
  }, [scenario]);

  useEffect(() => {
    clock.reset();
    const id = window.setTimeout(() => clock.play(), 350);
    return () => clearTimeout(id);
  }, [scenarioKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, [contenteditable=true], [role=slider], [cmdk-root]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing || paletteOpen) return;
      if (e.key === " ") {
        e.preventDefault();
        clock.toggle();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const steps = useConsole.getState().index;
        const next = Math.max(-1, Math.min(run.steps.length - 1, steps + (e.key === "ArrowRight" ? 1 : -1)));
        clock.pause();
        clock.seek(next < 0 ? 0 : run.steps[next].event.at + 560);
      } else if (/^[1-5]$/.test(e.key)) {
        setView(VIEWS[Number(e.key) - 1].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, run.steps, setView]);

  const viewIndex = scrub !== null ? stepIndexAt(run.steps, scrub) : index;
  const current = run.steps[viewIndex];

  return (
    <div className="hammertone relative min-h-svh">
      <header className="sticky top-0 z-30 border-b border-seam bg-housing-950/95 backdrop-blur-[6px]">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-3 no-underline" aria-label="MANDATE home">
            <span className="seam rounded-[3px] bg-housing-800 px-2.5 py-1 font-display text-[19px] leading-none font-extrabold tracking-[0.2em] text-engrave">MANDATE</span>
          </Link>
          <span className="engraved hidden text-[10px] md:inline">Console · Northwind Fabrication · synthetic fleet of 8 agents</span>
          <div className="ml-auto flex items-center gap-4">
            <Lamp on={playing} tone="amber" label={playing ? "Recording" : "Paused"} className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="key h-9 gap-3 bg-housing-800 px-3 text-[11px] text-engrave-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_0_0_1px_rgb(0_0_0/0.7)] hover:text-engrave"
              aria-keyshortcuts="Control+K /"
            >
              <CommandIcon className="size-3.5" aria-hidden="true" />
              Go to case, agent or view
              <kbd className="rounded-[3px] bg-housing-950 px-1.5 py-0.5 font-mono text-[10px] text-engrave-3">/</kbd>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-[1] grid gap-3 p-3 lg:grid-cols-[264px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)_372px] lg:p-4">
        <aside className="lg:sticky lg:top-[4.5rem] lg:h-[calc(100svh-5.5rem)]">
          <CaseRack run={run} />
        </aside>

        <main className="min-w-0 space-y-3">
          <section aria-labelledby="case-title" className="panel hammertone px-5 pt-5 pb-4 lg:px-7">
            <h1 id="case-title" className="font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[0.95] font-extrabold text-engrave">
              {scenario.title}
            </h1>
            <p className="mt-2.5 max-w-[78ch] text-[15px] leading-relaxed text-engrave-2">{scenario.premise}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-[10.5px] text-engrave-3">
                {scenario.id} · {scenario.agent} · {run.honorReceipts ? "receipts honoured" : "receipts ignored"}
              </span>
              {scenario.realWorld && (
                <a href={scenario.realWorld.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-engrave-3 no-underline hover:text-engrave">
                  Real-world pattern: {scenario.realWorld.name}
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              )}
            </p>
            <div role="tablist" aria-label="Console views" className="mt-5 flex flex-wrap gap-1.5">
              {VIEWS.map((v, i) => (
                <button
                  key={v.key}
                  role="tab"
                  aria-selected={view === v.key}
                  onClick={() => setView(v.key)}
                  className={cn("key h-8 gap-2 px-3 text-[10.5px]", view === v.key ? "bg-housing-600 text-engrave shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(0_0_0/0.7)]" : "bg-housing-850 text-engrave-3 shadow-[0_0_0_1px_rgb(0_0_0/0.6)] hover:text-engrave-2")}
                >
                  <span className="font-mono text-[9px] text-engrave-3">{i + 1}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </section>

          {view === "recorder" && <RecorderView run={run} />}
          {view === "chain" && <ChainView run={run} index={viewIndex} />}
          {view === "ledger" && <LedgerView run={run} />}
          {view === "mandate" && <MandateView run={run} />}
          {view === "calibration" && <CalibrationView />}
        </main>

        <aside className="space-y-3 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-[4.5rem] xl:h-[calc(100svh-5.5rem)] xl:overflow-y-auto xl:pr-0.5">
          <Report run={run} current={current} scrubbing={scrub !== null} />
          <ResponsePanel run={run} current={current} />
        </aside>
      </div>
      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} run={run} />
    </div>
  );
}
