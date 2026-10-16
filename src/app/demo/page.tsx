import { ExternalLink, PackageCheck, PackagePlus, RotateCcw, TriangleAlert } from "lucide-react";
import { captureKitAction, createKitAction, resetDemoAction } from "@/app/actions";
import { config } from "@/lib/config";
import { listKitOrders } from "@/lib/demo/kit";
import { ActionButton } from "@/components/action-button";
import { ItemTile, money, PageHeader, Panel, PanelHeader } from "@/components/ui";

const STEPS = [
  <>
    Use <strong className="font-semibold">US</strong> sandbox accounts for both the seller (Business) and the buyer (Personal). A non-US seller leaves every payment stuck
    as &quot;Unclaimed&quot;.
  </>,
  <>Press &quot;Create test orders&quot;. It makes four goods-and-services orders on your seller account.</>,
  <>Open each approve link, log in as the sandbox buyer and pay. The page then goes to example.com, which is expected.</>,
  <>Press &quot;Capture approved orders&quot;. Each payment should show COMPLETED. Two of them also get tracking added.</>,
  <>
    Log in at <span className="break-all">sandbox.paypal.com</span> as the buyer, open each payment, choose Report a problem, and file &quot;I didn&apos;t receive my
    item&quot; or &quot;Item is significantly not as described&quot;.
  </>,
  <>Wait a few minutes, then press Sync on the Disputes page. New cases can take a few minutes to appear.</>,
  <>
    To show a PayPal-confirmed result, submit evidence on a case at least 30 minutes before you need it. The Sandbox adjudication tool only appears after PayPal has had
    the case under review for 20 to 30 minutes.
  </>,
];

export default function DemoPage() {
  const sandbox = config.mode === "sandbox";
  const kit = sandbox ? listKitOrders() : [];
  return (
    <>
      <PageHeader
        title="Demo cases"
        intro="Sandbox disputes get used up once they are settled. Reset the demo here and open fresh cases, so the demo can be run again and again."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Panel className="h-fit">
          <PanelHeader title={sandbox ? "Clear local history" : "Reset the demo"} />
          <div className="px-5 py-4">
            <p className="text-sm text-ink-soft">
              {sandbox
                ? "Deletes DisputeDesk's local cache, agent runs and audit log, then reloads every dispute from PayPal Sandbox. Nothing changes at PayPal, so settled cases stay settled."
                : "Puts back eight fictional cases for a small handmade-goods shop: clear wins, hopeless ones, a costly one that needs approval, an unauthorised payment, and a buyer message that tries to trick the agent."}
            </p>
            <div className="mt-4">
              <ActionButton
                action={resetDemoAction}
                variant="primary"
                pendingLabel="Resetting"
                icon={<RotateCcw className="h-4 w-4" aria-hidden />}
                confirm={sandbox ? "Clear DisputeDesk's local history and reload from PayPal Sandbox?" : "Reset the demo cases? Agent runs and the audit log will be cleared."}
              >
                {sandbox ? "Clear and reload from PayPal" : "Reset demo cases"}
              </ActionButton>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Open fresh sandbox disputes by hand" description="PayPal does not let a seller app open disputes, so a person plays the buyer. About ten minutes." />
          <div className="px-5 py-5">
            {!sandbox && (
              <p className="mb-5 flex gap-2 rounded-lg bg-turmeric-soft p-3 text-sm text-turmeric-ink">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                You are in demo mode. Add PayPal Sandbox keys to the environment (see the README) to use these steps and the real PayPal path.
              </p>
            )}
            <ol className="flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-sm font-bold text-ink">{i + 1}</span>
                  <p className="pt-0.5 text-[0.92rem] text-ink-soft">{step}</p>
                </li>
              ))}
            </ol>

            {sandbox && (
              <>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-rule pt-5">
                  <ActionButton action={createKitAction} pendingLabel="Creating orders" icon={<PackagePlus className="h-4 w-4" aria-hidden />}>
                    Create test orders
                  </ActionButton>
                  <ActionButton action={captureKitAction} pendingLabel="Capturing" icon={<PackageCheck className="h-4 w-4" aria-hidden />}>
                    Capture approved orders
                  </ActionButton>
                </div>
                {kit.length > 0 && (
                  <ul className="mt-5 divide-y divide-rule rounded-lg border border-rule">
                    {kit.map((o) => (
                      <li key={o.orderId} className="flex gap-3 p-3 text-sm">
                        <ItemTile name={o.item} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold">{o.item}</span>
                            <span className="num font-semibold">{money(Number(o.amount))}</span>
                          </div>
                          <p className="mt-0.5 break-words text-muted">
                            Order {o.orderId}
                            {o.captureId ? `, payment ${o.captureId} ${o.captureStatus ?? ""}${o.captureReason ? ` (${o.captureReason})` : ""}` : ", not paid yet"}
                            {o.tracking ? `, tracking ${o.tracking}` : ""}
                          </p>
                          {!o.captureId && (
                            <a href={o.approveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-sky underline underline-offset-2">
                              Approve as the sandbox buyer <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
