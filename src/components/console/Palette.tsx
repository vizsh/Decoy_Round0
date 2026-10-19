import { useEffect, useRef } from "react";
import { Command } from "cmdk";
import { House, ReceiptText, RotateCcw } from "lucide-react";
import { SCENARIOS } from "@/engine/scenarios";
import { AGENTS } from "@/engine/world";
import { navigate } from "@/lib/router";
import { clock, useConsole, type ComputedRun, type View } from "@/state/console";

const VIEWS: { key: View; label: string }[] = [
  { key: "recorder", label: "Recorder" },
  { key: "chain", label: "Chain" },
  { key: "ledger", label: "Ledger" },
  { key: "mandate", label: "Mandate Card" },
  { key: "calibration", label: "Calibration" },
];

const item =
  "flex cursor-pointer items-baseline gap-3 rounded-[3px] px-3 py-2 text-[14px] text-ink-black aria-selected:bg-ink-black aria-selected:text-paper data-[selected=true]:bg-ink-black data-[selected=true]:text-paper";
const group = "px-1 pb-1 [&_[cmdk-group-heading]]:printed [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px]";

export function Palette({ open, onClose, run }: { open: boolean; onClose: () => void; run: ComputedRun }) {
  const setScenario = useConsole((s) => s.setScenario);
  const setView = useConsole((s) => s.setView);
  const setFocusAgent = useConsole((s) => s.setFocusAgent);
  const setReceipts = useConsole((s) => s.setReceipts);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const go = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-housing-950/70 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Command label="Go to a case, agent or view" className="paper w-full max-w-[560px] overflow-hidden rounded-[4px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]" loop>
        <div className="flex items-center gap-3 border-b-2 border-ink-black px-4 focus-within:border-ink-red focus-within:shadow-[inset_0_-2px_0_var(--color-ink-red)]">
          <span className="printed text-[10px]">Go to</span>
          <Command.Input ref={inputRef} placeholder="SCN-04, PRC-01, ledger, revoke…" className="h-12 w-full bg-transparent font-mono text-[14px] text-ink-black outline-none placeholder:text-ink-graphite" />
        </div>
        <Command.List className="max-h-[52vh] overflow-y-auto py-1">
          <Command.Empty className="px-4 py-6 text-[14px] text-ink-graphite">No case, agent or view by that address.</Command.Empty>
          <Command.Group heading="Cases" className={group}>
            {SCENARIOS.map((s) => (
              <Command.Item key={s.key} value={`${s.id} ${s.title} ${s.vector} ${s.agent}`} onSelect={() => go(() => setScenario(s.key))} className={item}>
                <span className="w-16 shrink-0 font-mono text-[11px] opacity-70">{s.id}</span>
                <span className="font-cond font-semibold">{s.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Agents" className={group}>
            {AGENTS.map((a) => (
              <Command.Item
                key={a.id}
                value={`${a.id} ${a.name} ${a.owner}`}
                onSelect={() =>
                  go(() => {
                    setFocusAgent(a.id);
                    setView("mandate");
                  })
                }
                className={item}
              >
                <span className="w-16 shrink-0 font-mono text-[11px] opacity-70">{a.id}</span>
                <span>{a.name}</span>
                <span className="ml-auto text-[11px] opacity-60">Mandate Card</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Views" className={group}>
            {VIEWS.map((v, i) => (
              <Command.Item key={v.key} value={`view ${v.label}`} onSelect={() => go(() => setView(v.key))} className={item}>
                <span className="w-16 shrink-0 font-mono text-[11px] opacity-70">{i + 1}</span>
                <span>{v.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Actions" className={group}>
            <Command.Item value="restart run replay" onSelect={() => go(() => (clock.reset(), clock.play()))} className={item}>
              <RotateCcw className="size-3.5 w-16 shrink-0 opacity-70" aria-hidden="true" />
              <span>Restart this case</span>
            </Command.Item>
            <Command.Item value="receipts ignore strip toggle ledger" onSelect={() => go(() => setReceipts(!run.honorReceipts))} className={item}>
              <ReceiptText className="size-3.5 w-16 shrink-0 opacity-70" aria-hidden="true" />
              <span>{run.honorReceipts ? "Ignore receipts in this case" : "Honour receipts again"}</span>
            </Command.Item>
            <Command.Item value="home landing overview" onSelect={() => go(() => navigate("/"))} className={item}>
              <House className="size-3.5 w-16 shrink-0 opacity-70" aria-hidden="true" />
              <span>Back to the overview</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
