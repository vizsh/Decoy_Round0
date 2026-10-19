import { useRef, type ButtonHTMLAttributes, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export function Lamp({ on = true, tone = "amber", label, className }: { on?: boolean; tone?: "amber" | "red" | "green"; label?: string; className?: string }) {
  const color = tone === "red" ? "var(--color-lamp-red)" : tone === "green" ? "var(--color-lamp-green)" : "var(--color-lamp-amber)";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="relative inline-block size-2.5 rounded-full"
        style={{
          background: on ? color : "var(--color-housing-600)",
          boxShadow: on ? `0 0 0 1px rgb(0 0 0 / 0.6), 0 0 10px 1px color-mix(in srgb, ${color} 55%, transparent), inset 0 -1px 1px rgb(0 0 0 / 0.35)` : "0 0 0 1px rgb(0 0 0 / 0.6), inset 0 1px 1px rgb(0 0 0 / 0.5)",
        }}
      />
      {label && <span className="engraved text-[10.5px]">{label}</span>}
    </span>
  );
}

type KeyTone = "lit" | "plain";

export function Key({ tone = "plain", className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: KeyTone }) {
  return (
    <button type="button" className={cn("key", keyClass(tone), className)} {...rest}>
      {children}
    </button>
  );
}

function keyClass(tone: KeyTone) {
  if (tone === "lit")
    return "bg-lamp-amber text-housing-950 px-5 h-12 text-[13px] shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-2px_0_rgb(0_0_0/0.25),0_0_0_1px_rgb(0_0_0/0.65),0_6px_18px_-6px_rgb(255_181_71/0.55)] hover:bg-[#ffc266]";
  return "bg-housing-700 text-engrave px-4 h-10 text-[12px] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_-2px_0_rgb(0_0_0/0.35),0_0_0_1px_rgb(0_0_0/0.7)] hover:bg-housing-600 disabled:opacity-45 disabled:cursor-not-allowed";
}


export interface DetentOption<T extends string> {
  value: T;
  label: string;
  tone?: "plain" | "warn" | "danger";
}

export function Detent<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 168,
  marker,
}: {
  options: DetentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: number;
  marker?: T;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const sweep = 220;
  const start = -sweep / 2;
  const step = options.length > 1 ? sweep / (options.length - 1) : 0;
  const angle = start + idx * step;
  const r = size / 2;
  const knobR = r * 0.46;
  const ref = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(options[Math.min(options.length - 1, idx + 1)].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(options[Math.max(0, idx - 1)].value);
    } else if (e.key === "Home") onChange(options[0].value);
    else if (e.key === "End") onChange(options[options.length - 1].value);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={options.length - 1}
        aria-valuenow={idx}
        aria-valuetext={options[idx].label}
        onKeyDown={onKey}
        className="relative rounded-full outline-offset-4"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} className="overflow-visible">
          {options.map((o, i) => {
            const a = ((start + i * step - 90) * Math.PI) / 180;
            const x1 = Math.cos(a) * (knobR + 8);
            const y1 = Math.sin(a) * (knobR + 8);
            const x2 = Math.cos(a) * (knobR + 16);
            const y2 = Math.sin(a) * (knobR + 16);
            const active = i === idx;
            const color = o.tone === "danger" ? "var(--color-lamp-red)" : o.tone === "warn" ? "var(--color-lamp-amber)" : "var(--color-engrave-2)";
            return (
              <g key={o.value} className="cursor-pointer" onClick={() => onChange(o.value)}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? color : "var(--color-engrave-3)"} strokeWidth={active ? 2.4 : 1.4} strokeLinecap="round" />
                {marker === o.value && <circle cx={Math.cos(a) * (knobR + 22)} cy={Math.sin(a) * (knobR + 22)} r={2.4} fill="var(--color-lamp-amber)" />}
                <circle cx={Math.cos(a) * (knobR + 14)} cy={Math.sin(a) * (knobR + 14)} r={14} fill="transparent" />
              </g>
            );
          })}
          <circle r={knobR + 3} fill="var(--color-housing-950)" />
          <g style={{ transform: `rotate(${angle}deg)`, transition: "transform 260ms var(--ease-out-expo)" }}>
            <circle r={knobR} fill="url(#knob-grad)" stroke="rgb(0 0 0 / 0.7)" />
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 * Math.PI) / 180;
              return <line key={i} x1={Math.cos(a) * (knobR - 1)} y1={Math.sin(a) * (knobR - 1)} x2={Math.cos(a) * (knobR - 5)} y2={Math.sin(a) * (knobR - 5)} stroke="rgb(0 0 0 / 0.35)" strokeWidth={1} />;
            })}
            <circle r={knobR * 0.62} fill="url(#knob-cap)" />
            <rect x={-1.6} y={-knobR + 6} width={3.2} height={knobR * 0.5} rx={1.6} fill="var(--color-engrave)" />
          </g>
          <defs>
            <radialGradient id="knob-grad" cx="35%" cy="30%" r="80%">
              <stop offset="0" stopColor="#5a6862" />
              <stop offset="0.6" stopColor="#2c3631" />
              <stop offset="1" stopColor="#1a211e" />
            </radialGradient>
            <radialGradient id="knob-cap" cx="40%" cy="35%" r="75%">
              <stop offset="0" stopColor="#46534d" />
              <stop offset="1" stopColor="#222a26" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <div className="mt-1 flex w-full justify-between gap-1" aria-hidden="true">
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(o.value)}
            className={cn("engraved text-[9.5px] leading-tight transition-colors", i === idx ? (o.tone === "danger" ? "text-lamp-red" : "text-lamp-amber") : "hover:text-engrave")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
