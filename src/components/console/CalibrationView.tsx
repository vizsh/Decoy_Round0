import { useEffect, useState } from "react";
import ScrubField from "@/components/ScrubField";
import { Key } from "@/components/recorder/parts";
import { evaluate, type EvalReport } from "@/engine/evaluate";
import { cn } from "@/lib/utils";

const VECTOR_LABEL: Record<string, string> = {
  injection: "Indirect prompt injection",
  unreceipted_change: "Unreceipted change",
  rug_pull: "Tool rug pull",
  stolen_token: "Stolen token",
  chain: "Agent-to-agent spread",
  slow_drift: "Slow drift",
};

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

export function CalibrationView() {
  const [seed, setSeed] = useState(2026);
  const [variants, setVariants] = useState(12);
  const [report, setReport] = useState<EvalReport | null>(null);
  const [busy, setBusy] = useState(false);

  const runSuite = (s = seed, v = variants) => {
    setBusy(true);
    window.setTimeout(() => {
      setReport(evaluate(s, v));
      setBusy(false);
    }, 30);
  };

  useEffect(() => {
    runSuite(2026, 12);
  }, []);

  return (
    <section aria-labelledby="cal-title" className="panel hammertone p-5 lg:p-7">
      <h2 id="cal-title" className="font-display text-[28px] leading-none font-extrabold text-engrave">
        Calibration
      </h2>
      <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-engrave-2">
        Every attack case is jittered into variants (different targets, exfil hosts, interleaved benign work, drift rates) and scored with held-out benign sessions from all eight agents. Change the seed to draw a different suite. This shows the rules behave as designed; it is not a real-world accuracy figure, and AgentDojo has not yet been measured.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <ScrubField label="Seed" suffix="" value={seed} min={1} max={9999} step={1} onChange={(v) => setSeed(Math.round(v))} accent="#ffb547" chipColor="#1e2723" size="md" />
        <ScrubField label="Variants per case" suffix="" value={variants} min={4} max={40} step={1} onChange={(v) => setVariants(Math.round(v))} accent="#ffb547" chipColor="#1e2723" size="md" />
        <Key tone="lit" onClick={() => runSuite()} disabled={busy} className="h-10 px-4 text-[11px]">
          {busy ? "Running…" : "Run suite"}
        </Key>
      </div>

      {report && (
        <div className={cn("paper mt-6 rounded-[3px] px-5 pt-4 pb-5 shadow-[0_18px_36px_-20px_rgb(0_0_0/0.9)] sm:px-7", busy && "opacity-60")}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink-black pb-3">
            <p className="printed text-[10.5px]">Synthetic suite · seed {report.seed}</p>
            <p className="font-mono text-[10.5px] text-ink-graphite">
              {report.attackSessions} attack + {report.benignSessions} benign sessions · {Math.round(report.ms)} ms in this browser
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[560px] text-left">
              <thead>
                <tr className="printed text-[10px]">
                  <th className="py-2.5 pr-3 font-semibold">Vector</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Sessions</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Alerted</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Contained in time</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">Steps to act</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[12.5px] tabular text-ink-black">
                {report.byVector.map((v) => (
                  <tr key={v.vector} className="border-t border-grid-minor">
                    <td className="py-2.5 pr-3 font-cond text-[15px] font-semibold">{VECTOR_LABEL[v.vector] ?? v.vector}</td>
                    <td className="px-3 py-2.5 text-right">{v.sessions}</td>
                    <td className="px-3 py-2.5 text-right">{v.detected}</td>
                    <td className={cn("px-3 py-2.5 text-right", v.containedBeforeLeak < v.sessions && "font-semibold text-ink-red")}>{v.containedBeforeLeak}</td>
                    <td className="py-2.5 pl-3 text-right">{v.vector === "slow_drift" ? `day ${v.meanStepsToContain.toFixed(1)}` : v.meanStepsToContain.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-5 grid gap-px overflow-hidden rounded-[3px] border border-paper-edge bg-paper-edge sm:grid-cols-4">
            {[
              ["Contained in time", pct(report.containedRate)],
              ["False alerts, benign", pct(report.falseAlertRate)],
              ["Benign sessions disrupted", pct(report.disruptionRate)],
              ["In-role work kept flowing", pct(report.utilityKept)],
            ].map(([k, v]) => (
              <div key={k} className="bg-paper px-4 py-3">
                <dt className="printed text-[9.5px]">{k}</dt>
                <dd className="mt-1 font-mono text-[19px] font-semibold text-ink-black tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {report.falseAlertReasons.length > 0 && (
            <div className="mt-4">
              <p className="printed text-[10px]">Benign sessions that alerted</p>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[10.5px] text-ink-black">
                {report.falseAlertReasons.slice(0, 6).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
