import { useCallback } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Recorder } from "@/components/recorder/Recorder";
import { PEN_MS } from "@/components/recorder/math";
import { useSize } from "@/lib/hooks";
import { DECISION_LABEL } from "@/lib/lenses";
import { cn } from "@/lib/utils";
import { clock, useClock, useConsole, type ComputedRun } from "@/state/console";

const SPEEDS = [0.5, 1, 2, 4];

export function RecorderView({ run }: { run: ComputedRun }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const setIndex = useConsole((s) => s.setIndex);
  const setScrub = useConsole((s) => s.setScrub);
  const index = useConsole((s) => s.index);
  const scrub = useConsole((s) => s.scrub);
  const { playing, speed, version } = useClock();
  const getTime = useCallback(() => clock.get(), []);
  const steps = run.steps;
  const compact = size.width < 760;
  const days = new Set(steps.map((s) => s.event.day).filter(Boolean)).size;

  const seekTo = (i: number) => {
    clock.pause();
    clock.seek(i < 0 ? 0 : steps[i].event.at + PEN_MS + 40);
  };

  return (
    <>
      <section aria-label="Strip chart" className="panel hammertone p-2">
        <div ref={ref} className="h-[clamp(360px,52svh,500px)] overflow-hidden rounded-[3px] bg-housing-950 shadow-[inset_0_2px_6px_rgb(0_0_0/0.75)]">
          {size.width > 0 && (
            <Recorder
              key={run.scenario.key}
              steps={steps}
              mode="fit"
              width={size.width}
              height={size.height}
              duration={run.duration}
              getTime={getTime}
              running={playing}
              tick={version}
              compact={compact}
              labelWidth={compact ? 64 : 86}
              scrubTime={scrub}
              onReveal={setIndex}
              onScrub={setScrub}
              ariaLabel={`Strip chart for ${run.scenario.title}. Hover to read any instant; the report on the right follows the cursor.`}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-2 pt-3 pb-1">
          <div className="flex items-center gap-1.5" role="group" aria-label="Transport">
            <TransportKey label="Restart" onClick={() => seekTo(-1)}>
              <RotateCcw className="size-3.5" />
            </TransportKey>
            <TransportKey label="Previous step" onClick={() => seekTo(Math.max(-1, index - 1))}>
              <SkipBack className="size-3.5" />
            </TransportKey>
            <button
              type="button"
              onClick={() => clock.toggle()}
              aria-label={playing ? "Pause" : "Play"}
              aria-keyshortcuts="Space"
              className={cn(
                "key h-10 w-[96px] gap-2 text-[11.5px]",
                playing ? "bg-housing-600 text-engrave shadow-[inset_0_2px_4px_rgb(0_0_0/0.5),0_0_0_1px_rgb(0_0_0/0.7)]" : "bg-lamp-amber text-housing-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-2px_0_rgb(0_0_0/0.25),0_0_0_1px_rgb(0_0_0/0.65)]",
              )}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Run"}
            </button>
            <TransportKey label="Next step" onClick={() => seekTo(Math.min(steps.length - 1, index + 1))}>
              <SkipForward className="size-3.5" />
            </TransportKey>
          </div>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Chart speed">
            <span className="engraved mr-1.5 text-[9.5px]">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={speed === s}
                onClick={() => clock.setSpeed(s)}
                className={cn("key h-7 px-2 font-mono text-[10px] tracking-normal normal-case", speed === s ? "bg-housing-600 text-engrave shadow-[0_0_0_1px_rgb(0_0_0/0.7)]" : "bg-housing-850 text-engrave-3 shadow-[0_0_0_1px_rgb(0_0_0/0.55)] hover:text-engrave-2")}
              >
                {s}×
              </button>
            ))}
          </div>
          <p className="ml-auto font-mono text-[10.5px] text-engrave-3 tabular">
            step {Math.max(0, index + 1)} of {steps.length}
            {days > 0 && ` · ${days} days compressed`}
            {scrub !== null && <span className="text-lamp-amber"> · reading {(scrub / 1000).toFixed(1)} s</span>}
          </p>
        </div>
      </section>

      <section aria-labelledby="tape-title" className="panel hammertone overflow-hidden">
        <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <h2 id="tape-title" className="engraved text-[10px]">Event tape</h2>
          <p className="font-mono text-[9.5px] text-engrave-3">Click a row to seek · ← → step · Space to run</p>
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="sticky top-0 z-[1] bg-housing-850">
              <tr className="engraved text-[9px]">
                <th className="py-2 pr-2 pl-5 font-semibold">Step</th>
                <th className="px-2 py-2 font-semibold">Agent</th>
                <th className="px-2 py-2 font-semibold">Action</th>
                <th className="px-2 py-2 font-semibold">IAM</th>
                <th className="px-2 py-2 font-semibold">Mandate gateway</th>
                <th className="py-2 pr-5 pl-2 text-right font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => {
                const future = i > index;
                const current = i === index;
                const bad = s.decision !== "allowed";
                return (
                  <tr
                    key={s.event.id}
                    onClick={() => seekTo(i)}
                    className={cn("cursor-pointer border-t border-seam transition-colors", current ? "bg-housing-700" : "hover:bg-housing-800", future && "opacity-35")}
                  >
                    <td className="py-2 pr-2 pl-5 font-mono text-[10.5px] text-engrave-3">
                      T{s.event.seq}
                      {s.event.day ? <span className="ml-1 text-engrave-3">d{s.event.day}</span> : null}
                    </td>
                    <td className="px-2 py-2 font-mono text-[10.5px] text-engrave-2">{s.event.agent}</td>
                    <td className="px-2 py-2 text-[13.5px] leading-snug text-engrave">{future ? <span className="text-engrave-3">pending</span> : s.event.summary}</td>
                    <td className="px-2 py-2 font-mono text-[10.5px] text-engrave-2">{future ? "" : s.iam === "allow" ? "ALLOW" : "DENY"}</td>
                    <td className={cn("px-2 py-2 font-mono text-[10.5px]", bad ? "font-semibold text-lamp-red" : "text-engrave-2")}>{future ? "" : DECISION_LABEL[s.decision].toUpperCase()}</td>
                    <td className={cn("py-2 pr-5 pl-2 text-right font-mono text-[11.5px] tabular", s.risk >= 45 ? "text-lamp-red" : "text-engrave")}>
                      {future ? "" : s.risk}
                      {!future && s.delta > 0 && <span className="ml-1.5 text-[9.5px] text-engrave-3">+{s.delta}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TransportKey({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="key size-10 bg-housing-700 text-engrave shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_-2px_0_rgb(0_0_0/0.35),0_0_0_1px_rgb(0_0_0/0.7)] hover:bg-housing-600">
      {children}
    </button>
  );
}
