import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Assessment } from "@/engine/types";
import { RUNG_FLOOR } from "@/engine/types";
import { DECISION_STAMP, LANES, laneValue, type LaneKey } from "@/lib/lenses";
import { LENS_LABEL } from "@/lib/lenses";

import { PEN_MS, stepIndexAt, valueAt, type Series } from "./math";

interface Row {
  key: LaneKey;
  y: number;
  h: number;
  ink: string;
  label: string;
  max: number;
}

interface Layout {
  marks: { y: number; h: number };
  margin: { y: number; h: number };
  rows: Row[];
  iam: { y: number; h: number };
  gate: { y: number; h: number };
}

function computeLayout(height: number, compact: boolean): Layout {
  const marksH = compact ? 18 : 24;
  const marginH = compact ? 46 : 84;
  const markerH = compact ? 21 : 25;
  const gap = compact ? 3 : 5;
  const order: LaneKey[] = ["risk", "mandate", "taint", "self", "herd", "chain", "drift"];
  const metas = order.map((k) => LANES.find((l) => l.key === k)!);
  const units = metas.reduce((s, m) => s + m.weight, 0);
  const avail = height - marksH - marginH - markerH * 2 - gap * (metas.length + 2);
  const unit = Math.max(10, avail / units);
  let y = marksH + marginH;
  const rows: Row[] = metas.map((m) => {
    const h = unit * m.weight;
    const row = { key: m.key, y, h, ink: m.ink, label: m.label, max: m.max };
    y += h + gap;
    return row;
  });
  const iam = { y: y + 2, h: markerH };
  const gate = { y: y + markerH + gap + 2, h: markerH };
  return { marks: { y: 0, h: marksH }, margin: { y: marksH, h: marginH }, rows, iam, gate };
}

const tremor = (x: number, i: number) => 0.45 * Math.sin(x * 0.31 + i * 1.7) + 0.35 * Math.sin(x * 0.083 + i * 0.9);

const yFor = (row: Row, v: number) => row.y + row.h - 3 - (Math.min(v, row.max) / row.max) * (row.h - 6);

function buildPath(series: Series, row: Row, k: number, endT: number, laneIdx: number, step = 4) {
  const parts: string[] = [];
  const total = endT * k;
  for (let x = 0; x <= total + 0.01; x += step) {
    const t = x / k;
    const y = yFor(row, valueAt(series, t)) + (row.key === "risk" ? tremor(x, laneIdx) * 0.6 : tremor(x, laneIdx));
    parts.push(`${parts.length ? "L" : "M"}${x.toFixed(1)},${y.toFixed(2)}`);
  }
  return parts.join("");
}

const labelFits = (text: string, room: number) => text.length * 8.5 * 0.68 + 4 <= room;

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export interface RecorderProps {
  steps: Assessment[];
  mode: "scroll" | "fit";
  width: number;
  height: number;
  duration: number;
  getTime: () => number;
  loopGapMs?: number;
  pxPerSec?: number;
  playhead?: number;
  labelWidth?: number;
  compact?: boolean;
  staticTime?: number | null;
  running?: boolean;
  tick?: number;
  scrubTime?: number | null;
  onReveal?: (index: number) => void;
  onScrub?: (t: number | null) => void;
  ariaLabel: string;
}

export function Recorder({
  steps,
  mode,
  width,
  height,
  duration,
  getTime,
  loopGapMs = 2400,
  pxPerSec = 62,
  playhead = 0.66,
  labelWidth = 86,
  compact = false,
  staticTime = null,
  running = true,
  tick = 0,
  scrubTime = null,
  onReveal,
  onScrub,
  ariaLabel,
}: RecorderProps) {
  const uid = useId().replace(/:/g, "");
  const layout = useMemo(() => computeLayout(height, compact), [height, compact]);
  const paperW = Math.max(0, width - labelWidth);
  const k = mode === "scroll" ? pxPerSec / 1000 : paperW > 0 ? (paperW - 24) / duration : 0.06;
  const cycle = duration + loopGapMs;
  const runLen = cycle * k;
  const penX = mode === "scroll" ? paperW * playhead : 0;
  const pivotGap = Math.min(56, Math.max(24, (paperW - penX) * 0.4));
  const labelRoom = paperW - penX - pivotGap - 14;

  const series = useMemo(() => {
    const out = {} as Record<LaneKey, Series>;
    for (const lane of LANES) out[lane.key] = steps.map((s) => ({ t: s.event.at, v: laneValue(s, lane.key) }));
    return out;
  }, [steps]);

  const paths = useMemo(
    () => (k > 0 ? layout.rows.map((row, i) => ({ row, d: buildPath(series[row.key], row, k, duration, i) })) : []),
    [layout, series, k, duration],
  );

  const [run, setRun] = useState(0);
  const [revealed, setRevealed] = useState(staticTime !== null ? stepIndexAt(steps, staticTime) : -1);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const paperRef = useRef<SVGGElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const nibRefs = useRef<(SVGGElement | null)[]>([]);
  const armRefs = useRef<(SVGLineElement | null)[]>([]);
  const carriageRef = useRef<SVGLineElement>(null);
  const localRef = useRef(0);
  const runRef = useRef(0);
  const revealedRef = useRef(-2);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const g = staticTime ?? getTime();
      let r = 0;
      let local = g;
      if (mode === "scroll" && staticTime === null) {
        r = Math.floor(g / cycle);
        local = g - r * cycle;
      }
      local = Math.min(local, duration);
      localRef.current = local;
      if (r !== runRef.current) {
        runRef.current = r;
        setRun(r);
      }
      const idx = stepIndexAt(steps, local);
      if (idx !== revealedRef.current) {
        revealedRef.current = idx;
        setRevealed(idx);
        onRevealRef.current?.(idx);
      }
      const runStart = r * runLen;
      const xNow = local * k;
      if (mode === "scroll") paperRef.current?.setAttribute("transform", `translate(${(penX - runStart - xNow).toFixed(2)},0)`);
      clipRef.current?.setAttribute("width", Math.max(0, xNow).toFixed(2));
      const nibX = mode === "scroll" ? penX : xNow + 0;
      layout.rows.forEach((row, i) => {
        const y = yFor(row, valueAt(series[row.key], local));
        nibRefs.current[i]?.setAttribute("transform", `translate(${nibX.toFixed(2)},${y.toFixed(2)})`);
        const arm = armRefs.current[i];
        if (arm) {
          arm.setAttribute("x2", nibX.toFixed(2));
          arm.setAttribute("y2", y.toFixed(2));
        }
      });
      if (mode === "fit") {
        carriageRef.current?.setAttribute("x1", nibX.toFixed(2));
        carriageRef.current?.setAttribute("x2", nibX.toFixed(2));
      }
      if (staticTime === null && running) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [getTime, staticTime, running, tick, mode, cycle, duration, steps, runLen, k, penX, layout, series]);

  const runs = mode === "scroll" && staticTime === null ? [run - 1, run].filter((r) => r >= 0) : [0];
  const visibleSteps = steps.slice(0, revealed + 1);
  const riskRow = layout.rows[0];

  const toTime = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - labelWidth;
    if (x < 0 || x > paperW) return null;
    if (mode === "fit") return { x, t: Math.max(0, Math.min(duration, x / k)) };
    const local = localRef.current;
    const t = local - (penX - x) / k;
    if (t < 0 || t > local) return null;
    return { x, t };
  };

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const hit = toTime(e.clientX, e.currentTarget.getBoundingClientRect());
    setHover(hit);
    onScrub?.(hit ? hit.t : null);
  };
  const handleLeave = () => {
    setHover(null);
    onScrub?.(null);
  };

  const scrubX = mode === "fit" && scrubTime !== null ? scrubTime * k : null;
  const readT = hover?.t ?? null;
  const readStep = readT !== null ? steps[stepIndexAt(steps, readT)] : undefined;

  if (width <= 0 || height <= 0) return null;

  return (
    <div className="relative select-none" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="block touch-pan-y"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        <defs>
          <pattern id={`${uid}-minor`} width={8} height={8} patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" fill="none" stroke="var(--color-grid-minor)" strokeWidth={0.7} />
          </pattern>
          <pattern id={`${uid}-major`} width={40} height={40} patternUnits="userSpaceOnUse">
            <rect width={40} height={40} fill={`url(#${uid}-minor)`} />
            <path d="M40 0H0V40" fill="none" stroke="var(--color-grid-major)" strokeWidth={0.9} />
          </pattern>
          <filter id={`${uid}-ink`} x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 2.25" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
          <clipPath id={`${uid}-paper`}>
            <rect x={labelWidth} y={0} width={paperW} height={height} />
          </clipPath>
          <clipPath id={`${uid}-written`}>
            <rect ref={clipRef} x={0} y={0} width={0} height={height} />
          </clipPath>
          <linearGradient id={`${uid}-shade`} x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.22" />
            <stop offset="0.06" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${uid}-paper)`}>
          <g transform={`translate(${labelWidth},0)`}>
            <g ref={paperRef}>
              <rect x={mode === "scroll" ? Math.max(0, run - 1) * runLen - 40 : 0} y={0} width={mode === "scroll" ? runLen * 2 + paperW + 80 : paperW} height={height} fill="var(--color-paper)" />
              <rect x={mode === "scroll" ? Math.max(0, run - 1) * runLen - 40 : 0} y={0} width={mode === "scroll" ? runLen * 2 + paperW + 80 : paperW} height={height} fill={`url(#${uid}-major)`} />

              {runs.map((r) => (
                <g key={r} transform={`translate(${r * runLen},0)`}>
                  {mode === "scroll" && (
                    <g>
                      <line x1={-loopGapMs * k * 0.5} x2={-loopGapMs * k * 0.5} y1={0} y2={height} stroke="var(--color-paper-edge)" strokeDasharray="2 5" strokeWidth={1.2} />
                      <text x={6} y={layout.marks.h - 7} className="printed" fontSize={9} fill="var(--color-grid-ink)">
                        Run {String(r + 1).padStart(3, "0")} · chart speed {pxPerSec / 10} mm/s · synthetic telemetry
                      </text>
                    </g>
                  )}
                  {layout.rows.map((row) =>
                    row.key === "risk" ? (
                      <g key="thr">
                        {(["approval", "scope", "sandbox", "revoke"] as const).map((rung) => (
                          <line key={rung} x1={0} x2={duration * k + 40} y1={yFor(row, RUNG_FLOOR[rung] / 100)} y2={yFor(row, RUNG_FLOOR[rung] / 100)} stroke="var(--color-ink-red)" strokeOpacity={0.28} strokeDasharray="1 4" strokeWidth={1} />
                        ))}
                      </g>
                    ) : row.key === "drift" ? (
                      <line key="shelf" x1={0} x2={duration * k + 40} y1={yFor(row, 1)} y2={yFor(row, 1)} stroke="var(--color-ink-graphite)" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="6 3" />
                    ) : null,
                  )}
                  <g clipPath={r === run ? `url(#${uid}-written)` : undefined}>
                    {paths.map(({ row, d }) => (
                      <path key={row.key} d={d} fill="none" stroke={row.ink} strokeWidth={row.key === "risk" ? 2.1 : 1.35} strokeLinejoin="round" strokeLinecap="round" opacity={0.92} />
                    ))}
                  </g>
                  {(r === run ? visibleSteps : steps).map((s, i, arr) => (
                    <StepMarks
                      key={s.event.id}
                      s={s}
                      i={i}
                      k={k}
                      layout={layout}
                      riskRow={riskRow}
                      uid={uid}
                      compact={compact}
                      room={arr[i + 1] ? (arr[i + 1].event.at - s.event.at) * k : mode === "scroll" ? Math.min(250, paperW - penX - 8) : Math.max(60, paperW - s.event.at * k - 12)}
                      crowded={i > 0 && (s.event.at - arr[i - 1].event.at) * k < 46 && arr[i - 1].newFactors.some((key) => (arr[i - 1].factors.find((f) => f.key === key)?.points ?? 0) > 0)}
                    />
                  ))}
                </g>
              ))}
            </g>
          </g>
          <rect x={labelWidth} y={0} width={40} height={height} fill={`url(#${uid}-shade)`} pointerEvents="none" />
        </g>

        <g aria-hidden="true">
          <rect x={0} y={0} width={labelWidth} height={height} className="fill-housing-800" />
          <line x1={labelWidth - 0.5} x2={labelWidth - 0.5} y1={0} y2={height} stroke="var(--color-seam)" strokeWidth={1} />
          {layout.rows.map((row) => (
            <g key={row.key}>
              <rect x={8} y={row.y + row.h / 2 - 1} width={6} height={2} fill={row.ink === "var(--color-ink-black)" ? "var(--color-engrave)" : row.ink} rx={1} style={row.ink === "var(--color-ink-black)" ? undefined : { filter: "brightness(1.6) saturate(1.2)" }} />
              <text x={20} y={row.y + row.h / 2 + 3.5} className="engraved" fontSize={compact ? 9 : 10.5} fill="var(--color-engrave-2)">
                {row.label}
              </text>
              {row.key === "risk" && !compact && (
                <text x={20} y={row.y + row.h / 2 + 17} className="engraved" fontSize={8.5} fill="var(--color-engrave-3)">
                  0–100
                </text>
              )}
            </g>
          ))}
          <text x={20} y={layout.iam.y + layout.iam.h / 2 + 3.5} className="engraved" fontSize={compact ? 8.5 : 9.5} fill="var(--color-engrave-2)">
            IAM says
          </text>
          <text x={20} y={layout.gate.y + layout.gate.h / 2 + 3.5} className="engraved" fontSize={compact ? 8.5 : 9.5} fill="var(--color-lamp-amber)">
            Mandate
          </text>
          <text x={20} y={layout.margin.y + 14} className="engraved" fontSize={8.5} fill="var(--color-engrave-3)">
            {compact ? "" : "Examiner"}
          </text>
        </g>

        {mode === "scroll" && (
          <g aria-hidden="true">
            {(["approval", "scope", "sandbox", "revoke"] as const).map((rung) => {
              const full = `${RUNG_FLOOR[rung]} ${rung === "scope" ? "scope down" : rung}`;
              const text = labelFits(full, labelRoom) ? full : labelFits(String(RUNG_FLOOR[rung]), labelRoom) ? String(RUNG_FLOOR[rung]) : null;
              return text ? (
                <text key={rung} x={labelWidth + paperW - 6} y={yFor(riskRow, RUNG_FLOOR[rung] / 100) + 3} textAnchor="end" className="printed halo" fontSize={8.5} fill="var(--color-ink-red)">
                  {text}
                </text>
              ) : null;
            })}
            {labelFits("drift budget", labelRoom) && (
              <text x={labelWidth + paperW - 6} y={yFor(layout.rows[6], 1) + 3} textAnchor="end" className="printed halo" fontSize={8.5} fill="var(--color-ink-graphite)">
                drift budget
              </text>
            )}
          </g>
        )}

        <g transform={`translate(${labelWidth},0)`} aria-hidden="true" pointerEvents="none">
          {mode === "scroll" &&
            layout.rows.map((row, i) => (
              <g key={row.key}>
                <line
                  ref={(el) => {
                    armRefs.current[i] = el;
                  }}
                  x1={penX + pivotGap}
                  y1={row.y + row.h / 2}
                  x2={penX}
                  y2={row.y + row.h / 2}
                  stroke="var(--color-housing-600)"
                  strokeWidth={row.key === "risk" ? 2.2 : 1.4}
                  strokeLinecap="round"
                />
                <circle cx={penX + pivotGap} cy={row.y + row.h / 2} r={row.key === "risk" ? 4.5 : 3.4} fill="var(--color-housing-700)" stroke="var(--color-housing-950)" strokeWidth={1} />
                <circle cx={penX + pivotGap} cy={row.y + row.h / 2} r={1.2} fill="var(--color-engrave-3)" />
              </g>
            ))}
          {mode === "fit" && <line ref={carriageRef} x1={0} x2={0} y1={layout.rows[0].y - 6} y2={layout.gate.y + layout.gate.h} stroke="var(--color-housing-600)" strokeOpacity={0.5} strokeWidth={1} />}
          {layout.rows.map((row, i) => (
            <g
              key={row.key}
              ref={(el) => {
                nibRefs.current[i] = el;
              }}
            >
              <circle r={row.key === "risk" ? 4.2 : 3} fill={row.ink} />
              <circle r={row.key === "risk" ? 7 : 5} fill="none" stroke={row.ink} strokeOpacity={0.3} />
            </g>
          ))}
          {scrubX !== null && <line x1={scrubX} x2={scrubX} y1={0} y2={height} stroke="var(--color-ink-black)" strokeWidth={1} strokeDasharray="3 3" />}
          {hover && <line x1={hover.x} x2={hover.x} y1={0} y2={height} stroke="var(--color-ink-black)" strokeOpacity={0.7} strokeWidth={1} />}
        </g>
      </svg>

      {hover && readStep && readT !== null && (
        <div
          className="pointer-events-none absolute z-10 w-[230px] rounded-[3px] paper px-3 py-2.5 shadow-[0_8px_20px_-8px_rgb(0_0_0/0.7)]"
          style={{ left: Math.min(width - 240, labelWidth + hover.x + 12), top: layout.rows[1].y }}
        >
          <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] tabular text-ink-graphite">
            <span>T{readStep.event.seq} · {(readT / 1000).toFixed(1)} s</span>
            <span className="font-semibold text-ink-red">risk {Math.round(valueAt(series.risk, readT) * 100)}</span>
          </div>
          <p className="mt-1 font-cond text-[12.5px] leading-snug font-semibold text-ink-black">{readStep.event.summary}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {LANES.filter((l) => l.key !== "risk").map((l) => (
              <div key={l.key} className="flex items-center justify-between gap-2 font-mono text-[9.5px] tabular">
                <dt style={{ color: l.ink }}>{LENS_LABEL[l.key as keyof typeof LENS_LABEL]}</dt>
                <dd className="text-ink-black">{Math.round(valueAt(series[l.key], readT) * 100)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function wrapWords(text: string, firstChars: number, chars: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const limit = lines.length === 0 ? firstChars : chars;
    if (line && (line + " " + w).length > limit) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines;
}

function InkStamp({ text, ink, filled, size, uid, rotate = -4 }: { text: string; ink: string; filled?: boolean; size: number; uid: string; rotate?: number }) {
  const w = text.length * size * 0.56 + size * 0.9;
  const h = size + 6;
  return (
    <g transform={`rotate(${rotate})`} filter={`url(#${uid}-ink)`}>
      <g className="stamp-land">
        <rect x={0} y={-h + 3} width={w} height={h} fill={filled ? ink : "none"} stroke={ink} strokeWidth={1.6} rx={2} />
        <text x={size * 0.45} y={-1} fontSize={size} fontFamily="var(--font-display)" fontWeight={800} letterSpacing="0.07em" fill={filled ? "var(--color-paper)" : ink}>
          {text}
        </text>
      </g>
    </g>
  );
}

function StepMarks({ s, i, k, layout, riskRow, uid, compact, room, crowded = false }: { s: Assessment; i: number; k: number; layout: Layout; riskRow: Row; uid: string; compact: boolean; room: number; crowded?: boolean }) {
  const x = s.event.at * k;
  const labelChars = Math.floor((room - 34) / 5.7);
  const stamp = DECISION_STAMP[s.decision];
  const riskY = yFor(riskRow, s.risk / 100);
  const change = s.event.kind === "change";
  const iamOk = s.iam === "allow";
  const gateOk = s.decision === "allowed";
  const receipt = s.event.change?.receipt?.id;
  const markSize = compact ? 11 : 12.5;
  const dense = room < markSize * 4.8;
  const tick = (ink: string, filled: boolean, dashed = false) => (
    <g className="stamp-land">
      <rect x={0} y={-9} width={Math.max(3, Math.min(8, room - 3))} height={8} rx={1} fill={filled ? ink : "none"} stroke={ink} strokeWidth={1.2} strokeDasharray={dashed ? "1.5 1.5" : undefined} />
    </g>
  );

  const fresh = s.factors.filter((f) => s.newFactors.includes(f.key) && f.points > 0).sort((a, b) => b.points - a.points);
  const notes: { f: (typeof fresh)[number]; size: number; lines: string[]; y: number }[] = [];
  let cursor = layout.margin.y + (compact ? 11 : 15);
  const bottom = layout.margin.y + layout.margin.h - 2;
  for (const f of crowded ? [] : fresh.slice(0, compact ? 1 : 3)) {
    const size = compact ? Math.max(9.5, Math.min(12, 9 + f.points * 0.08)) : Math.max(10.5, Math.min(16.5, 9.5 + f.points * 0.24));
    const lh = size * 1.06;
    const chars = Math.max(7, Math.floor((room - 10) / (size * 0.5)));
    const lines = wrapWords(f.label, chars - 4, chars);
    const h = lines.length * lh;
    if (cursor + h - lh > bottom && notes.length > 0) break;
    notes.push({ f, size, lines, y: cursor });
    cursor += h + (compact ? 3 : 6);
  }

  return (
    <g>
      <line x1={x} x2={x} y1={layout.marks.h - 8} y2={layout.marks.h} stroke="var(--color-ink-black)" strokeWidth={1.4} />
      {room >= 20 && (
        <text x={x + 4} y={layout.marks.h - 9} fontSize={compact ? 8 : 9} className="font-mono" fill="var(--color-ink-black)">
          T{s.event.seq}
          {!compact && labelChars >= 8 && (
            <tspan fill="var(--color-ink-graphite)" dx={5}>
              {truncate(s.event.summary, labelChars)}
            </tspan>
          )}
        </text>
      )}

      {notes.map(({ f, size, lines, y }) => {
        const inferred = f.certainty === "inferred";
        const lh = size * 1.06;
        return (
          <g key={f.key}>
            <line x1={x + 3} y1={y + (lines.length - 1) * lh + 3} x2={x + PEN_MS * k} y2={riskY - 4} stroke="var(--color-ink-black)" strokeOpacity={inferred ? 0.55 : 0.8} strokeWidth={inferred ? 0.6 : 1} strokeDasharray={inferred ? "2 2" : undefined} />
            <text x={x + 6} y={y} fontSize={size} className="font-cond halo" fontWeight={650} fill="var(--color-ink-black)">
              <tspan fill="var(--color-ink-red)" fontFamily="var(--font-mono)" fontSize={size * 0.78} fontWeight={600}>
                +{f.points}
              </tspan>
              <tspan dx={4}>{lines[0]}</tspan>
              {lines.slice(1).map((l, n) => (
                <tspan key={n} x={x + 6} dy={lh}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {stamp && (
        <g transform={`translate(${x + 10},${riskRow.y + riskRow.h - (compact ? 6 : 12)})`}>
          <InkStamp text={stamp.toUpperCase()} ink="var(--color-ink-red)" size={compact ? 11 : 14.5} uid={uid} rotate={-5} />
        </g>
      )}

      <g transform={`translate(${x + 1},${layout.iam.y + layout.iam.h - 3})`}>
        {change ? (
          dense ? (
            tick("var(--color-ink-graphite)", false, true)
          ) : (
            <text x={2} y={-4} fontSize={compact ? 8 : 9} className="font-mono" fill="var(--color-ink-graphite)">
              CHANGE
            </text>
          )
        ) : dense ? (
          tick(iamOk ? "var(--color-ink-black)" : "var(--color-ink-red)", !iamOk)
        ) : (
          <InkStamp text={iamOk ? "ALLOWED" : "DENIED"} ink={iamOk ? "var(--color-ink-black)" : "var(--color-ink-red)"} size={markSize} uid={uid} />
        )}
      </g>
      <g transform={`translate(${x + 1},${layout.gate.y + layout.gate.h - 3})`}>
        {dense ? (
          change ? (
            tick(receipt ? "var(--color-ink-green)" : "var(--color-ink-red)", false, true)
          ) : (
            tick(gateOk ? "var(--color-ink-black)" : "var(--color-ink-red)", !gateOk)
          )
        ) : change ? (
          <InkStamp text={receipt ?? "NO RECEIPT"} ink={receipt ? "var(--color-ink-green)" : "var(--color-ink-red)"} size={markSize} uid={uid} rotate={-3} />
        ) : gateOk ? (
          <InkStamp text="ALLOWED" ink="var(--color-ink-black)" size={markSize} uid={uid} rotate={-3} />
        ) : (
          <InkStamp text={(stamp ?? "").toUpperCase()} ink="var(--color-ink-red)" filled size={markSize} uid={uid} rotate={-3} />
        )}
      </g>
      <title>{`T${i} ${s.event.summary}`}</title>
    </g>
  );
}
