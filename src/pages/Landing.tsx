import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import Counter from "@/components/Counter";
import { Recorder } from "@/components/recorder/Recorder";
import { Lamp } from "@/components/recorder/parts";
import { runScenario } from "@/engine/run";
import { scenarioByKey } from "@/engine/scenarios";
import { RUNGS, type Rung } from "@/engine/types";
import { useReducedMotion, useSize } from "@/lib/hooks";
import { Link } from "@/lib/router";
import { RUNG_LABEL } from "@/lib/lenses";
import { cn } from "@/lib/utils";
import {
  CalibrationSection,
  CirclesSection,
  CloseSection,
  ContextSection,
  LadderSection,
  LensesSection,
  LimitsSection,
  MandateCardSection,
  ReadoutSection,
  ReceiptsSection,
} from "./landing/sections";

const NAV = [
  { href: "#reading", label: "How it reads" },
  { href: "#lenses", label: "Lenses" },
  { href: "#containment", label: "Containment" },
  { href: "#mandate", label: "Mandate Card" },
  { href: "#evidence", label: "Evidence" },
];

export default function Landing() {
  return (
    <div className="hammertone relative min-h-svh">
      <Nameplate />
      <main className="relative z-[1]">
        <Hero />
        <CirclesSection />
        <ReadoutSection />
        <LensesSection />
        <ReceiptsSection />
        <LadderSection />
        <MandateCardSection />
        <CalibrationSection />
        <ContextSection />
        <LimitsSection />
        <CloseSection />
      </main>
    </div>
  );
}

function Nameplate() {
  return (
    <header className="sticky top-0 z-30 border-b border-seam bg-housing-950/92 backdrop-blur-[6px]">
      <div className="flex h-14 items-center gap-5 px-4 sm:px-6 lg:px-10 xl:gap-6">
        <Link to="/" className="flex items-center gap-3 no-underline" aria-label="MANDATE home">
          <span className="seam rounded-[3px] bg-housing-800 px-2.5 py-1 font-display text-[21px] leading-none font-extrabold tracking-[0.2em] text-engrave">MANDATE</span>
          <span className="engraved hidden text-[10px] xl:inline">Agent behaviour recorder · MR-1</span>
          <span className="engraved hidden text-[10px] md:inline xl:hidden">MR-1</span>
        </Link>
        <span className="seam hidden items-baseline gap-2 rounded-[3px] bg-housing-950 px-2 py-1 md:inline-flex" aria-label="Chart speed 6.2 millimetres per second">
          <span className="engraved text-[9px]">Chart</span>
          <span className="font-mono text-[11px] text-lamp-amber tabular">6.2</span>
          <span className="engraved text-[9px]">mm/s</span>
        </span>
        <nav aria-label="Sections" className="ml-auto hidden items-center gap-5 lg:flex xl:gap-6">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="engraved text-[11px] no-underline transition-colors hover:text-engrave">
              {n.label}
            </a>
          ))}
        </nav>
        <Link to="/console" className="key ml-auto h-9 bg-housing-700 px-3.5 text-[11.5px] text-engrave no-underline shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_-2px_0_rgb(0_0_0/0.35),0_0_0_1px_rgb(0_0_0/0.7)] hover:bg-housing-600 lg:ml-2">
          <Lamp tone="amber" />
          Open console
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  const scenario = scenarioByKey("poisoned-pdf");
  const run = useMemo(() => runScenario(scenario), [scenario]);
  const steps = run.steps;
  const duration = steps.at(-1)!.event.at + 3800;
  const reduced = useReducedMotion();
  const frozenAt = useMemo(() => {
    const v = Number(new URLSearchParams(window.location.search).get("at"));
    return Number.isFinite(v) && v > 0 ? Math.min(v, duration) : null;
  }, [duration]);
  const t0 = useRef(performance.now() - 1800);
  const getTime = useCallback(() => (performance.now() - t0.current) * 1.55, []);
  const [idx, setIdx] = useState(-1);
  const [chartRef, size] = useSize<HTMLDivElement>();
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [chartRef]);
  const cur = steps[idx];
  const seen = steps.slice(0, idx + 1);
  const passed = seen.filter((s) => s.iam === "allow").length;
  const risk = cur?.risk ?? 0;
  const rung: Rung = cur?.rung ?? "observe";
  const compact = size.width < 640;

  return (
    <section aria-labelledby="hero-title" className="relative grid min-h-[calc(100svh-3.5rem)] grid-cols-1 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <div className="relative flex flex-col justify-center px-4 pt-7 pb-6 sm:px-8 sm:pt-12 lg:py-16 lg:pr-10 lg:pl-[max(2.5rem,calc((100vw-1520px)/2+2.5rem))]">
        <h1 id="hero-title" className="font-display text-[clamp(3.1rem,7.4vw,6rem)] leading-[0.88] font-extrabold tracking-[-0.012em] text-engrave">
          The token is valid.
          <span className="block text-lamp-red">The behaviour isn’t.</span>
        </h1>
        <p className="mt-5 max-w-[34rem] text-[17.5px] leading-[1.5] text-engrave-2 sm:mt-7">Every AI agent, checked against the job it was hired to do.</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-9">
          <Link to="/console" className="key h-12 bg-lamp-amber px-5 text-[13px] text-housing-950 no-underline shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-2px_0_rgb(0_0_0/0.25),0_0_0_1px_rgb(0_0_0/0.65),0_6px_18px_-6px_rgb(255_181_71/0.55)] hover:bg-[#ffc266]">
            <Play className="size-4" strokeWidth={2.4} aria-hidden="true" />
            Run the live console
          </Link>
          <a href="#mandate" className="engraved inline-flex items-center gap-2 text-[12px] text-engrave no-underline hover:text-lamp-amber">
            Read a Mandate Card
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-col justify-center pb-10 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pb-2.5 sm:px-8 lg:px-0">
          <p className="engraved text-[10px]">
            Case {scenario.id} · {run.steps[0].event.agent} {scenario.title.toLowerCase()} · Northwind Fabrication (synthetic)
          </p>
          {scenario.realWorld && (
            <a href={scenario.realWorld.url} target="_blank" rel="noreferrer" className="engraved inline-flex items-center gap-1 pr-4 text-[10px] text-engrave-3 no-underline hover:text-engrave lg:pr-8">
              Pattern of {scenario.realWorld.name.split(",")[0]}
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          )}
        </div>
        <div className="relative rounded-l-[6px] bg-housing-950 p-1.5 pr-0 shadow-[inset_0_2px_6px_rgb(0_0_0/0.75),0_1px_0_rgb(255_255_255/0.04)] lg:rounded-r-none">
          <div ref={chartRef} className="relative h-[clamp(360px,62svh,600px)] overflow-hidden rounded-l-[3px]">
            {size.width > 0 && (
              <Recorder
                steps={steps}
                mode="scroll"
                width={size.width}
                height={size.height}
                duration={duration}
                getTime={getTime}
                staticTime={frozenAt ?? (reduced ? duration : null)}
                running={inView}
                pxPerSec={compact ? 44 : 62}
                playhead={compact ? 0.62 : 0.7}
                labelWidth={compact ? 64 : 92}
                compact={compact}
                onReveal={setIdx}
                ariaLabel={`Live strip chart of case ${scenario.id}: risk rises from 0 to 100 as the procurement agent reads HR data after an untrusted PDF, while IAM allows every step.`}
              />
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-3 px-4 sm:px-8 lg:pl-0">
          <div className="flex items-center gap-3">
            <span className="engraved text-[10px]">Risk</span>
            <span className="seam inline-flex rounded-[3px] bg-housing-950 px-2.5 py-1">
              <Counter value={risk} minDigits={3} fontSize={30} fontWeight={600} textColor={risk >= 45 ? "var(--color-lamp-red)" : "var(--color-lamp-amber)"} className="font-mono" intro={false} />
            </span>
          </div>
          <dl className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-[3px] bg-seam seam">
            {[
              ["Credentials", "Valid", false],
              ["Access checks", `${passed} of ${seen.length} passed`, false],
              ["Mandate", cur && cur.risk >= 45 ? "Breached" : "Within role", !!cur && cur.risk >= 45],
            ].map(([k, v, bad]) => (
              <div key={String(k)} className="bg-housing-900 px-3 py-1.5">
                <dt className="engraved text-[8.5px]">{k}</dt>
                <dd className={cn("font-cond text-[14px] leading-tight font-semibold tabular", bad ? "text-lamp-red" : "text-engrave")}>{v}</dd>
              </div>
            ))}
          </dl>
          <ol className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5" aria-label="Response ladder">
            {RUNGS.map((r) => (
              <li key={r} className="flex items-center gap-1.5">
                <Lamp on={r === rung} tone={r === "observe" ? "green" : r === "approval" ? "amber" : "red"} />
                <span className={cn("engraved text-[9.5px]", r === rung && "text-engrave")}>{RUNG_LABEL[r]}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
