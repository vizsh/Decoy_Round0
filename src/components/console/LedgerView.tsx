import { cn } from "@/lib/utils";
import { useConsole, type ComputedRun } from "@/state/console";

export function LedgerView({ run }: { run: ComputedRun }) {
  const setReceipts = useConsole((s) => s.setReceipts);
  const receipts = useConsole((s) => s.receipts);
  const ledger = run.engine.ledger;
  const honoured = run.honorReceipts;
  const peak = Math.max(0, ...run.steps.map((s) => s.risk));

  return (
    <section aria-labelledby="ledger-title" className="panel hammertone p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="ledger-title" className="font-display text-[28px] leading-none font-extrabold text-engrave">
            Change Ledger
          </h2>
          <p className="mt-2 max-w-[66ch] text-[14.5px] leading-relaxed text-engrave-2">
            Deploys, prompt versions, tool-definition hashes and owner-signed amendments. A change with a receipt widens the baseline; the same change without one raises risk. Turn receipts off to see what this case looks like to a system that cannot tell them apart.
          </p>
        </div>
        <div role="radiogroup" aria-label="Receipts" className="flex overflow-hidden rounded-[4px] shadow-[0_0_0_1px_rgb(0_0_0/0.7)]">
          {[
            { v: true, label: "Honour receipts" },
            { v: false, label: "Ignore receipts" },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              role="radio"
              aria-checked={honoured === o.v}
              onClick={() => setReceipts(o.v === (run.scenario.honorReceipts ?? true) && receipts !== null ? null : o.v)}
              className={cn("key h-9 rounded-none px-3 text-[10.5px]", honoured === o.v ? (o.v ? "bg-housing-600 text-engrave" : "bg-[#3a1d1a] text-lamp-red") : "bg-housing-850 text-engrave-3 hover:text-engrave-2")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 font-mono text-[11px] text-engrave-3">
        Peak risk in this case with receipts {honoured ? "honoured" : "ignored"}: <span className={peak >= 45 ? "text-lamp-red" : "text-lamp-green"}>{peak}</span>
      </p>
      {ledger.length === 0 ? (
        <p className="mt-6 text-[14px] text-engrave-3">No change events in this case. Load SCN-02 and SCN-03 to compare a receipted deploy with the same change unreceipted, or SCN-04 for a silent tool-definition change.</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {ledger.map((e, i) => (
            <li key={i} className="paper grid gap-3 rounded-[3px] px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
              <span className="printed text-[10px]">{e.type.replace("_", " ")}</span>
              <div>
                <p className="font-cond text-[15.5px] font-semibold text-ink-black">{e.description}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-ink-graphite">
                  {e.agent}
                  {e.covers.length > 0 && ` · covers ${e.covers.join(", ")}`}
                </p>
              </div>
              {e.receipt ? (
                <div className="text-right">
                  <span className={cn("stamp inline-block text-[12px]", e.honored ? "text-ink-green" : "text-ink-graphite")}>{e.honored ? `Receipt ${e.receipt.id}` : "Receipt ignored"}</span>
                  <p className="mt-1 font-mono text-[9.5px] text-ink-graphite">
                    {e.receipt.ref} · {e.receipt.approvedBy}
                  </p>
                </div>
              ) : (
                <span className="stamp text-[12px]">No receipt</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
