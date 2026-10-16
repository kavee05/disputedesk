import { captureKitAction, createKitAction, resetDemoAction } from "@/app/actions";
import { config } from "@/lib/config";
import { listKitOrders } from "@/lib/demo/kit";
import { ActionButton } from "@/components/action-button";
import { money, PageHeader } from "@/components/ui";

export default function DemoPage() {
  const sandbox = config.mode === "sandbox";
  const kit = sandbox ? listKitOrders() : [];
  return (
    <>
      <PageHeader
        title="Demo cases"
        intro="Sandbox disputes get used up once they are settled. This page resets the demo and helps you open fresh cases, so the demo can be run again and again."
      />

      <section className="max-w-3xl rounded-lg border border-rule bg-surface p-5">
        <h2 className="text-xl font-bold">{sandbox ? "Clear local history" : "Reset the demo"}</h2>
        <p className="mt-1 text-ink-soft">
          {sandbox
            ? "Deletes DisputeDesk's local cache, agent runs and audit log, then reloads every dispute from PayPal Sandbox. It does not change anything at PayPal, so settled cases stay settled."
            : "Puts back eight fictional cases for a small handmade-goods shop: clear wins, hopeless ones, a costly one that needs approval, an unauthorised payment, and a buyer message that tries to trick the agent."}
        </p>
        <div className="mt-4">
          <ActionButton
            action={resetDemoAction}
            variant="primary"
            pendingLabel="Resetting"
            confirm={sandbox ? "Clear DisputeDesk's local history and reload from PayPal Sandbox?" : "Reset the demo cases? Agent runs and the audit log will be cleared."}
          >
            {sandbox ? "Clear and reload from PayPal" : "Reset demo cases"}
          </ActionButton>
        </div>
      </section>

      <section className="mt-6 max-w-3xl rounded-lg border border-rule bg-surface p-5">
        <h2 className="text-xl font-bold">Open fresh sandbox disputes by hand</h2>
        {!sandbox && (
          <p className="mt-1 rounded-md bg-turmeric-soft p-3 text-sm text-turmeric-ink">
            You are in demo mode. Add PayPal Sandbox keys to the environment (see the README) to use these steps and the real PayPal path.
          </p>
        )}
        <p className="mt-2 text-ink-soft">PayPal does not let a seller app open disputes on its own, so a person plays the buyer. It takes about ten minutes.</p>
        <ol className="mt-3 flex list-decimal flex-col gap-2.5 pl-5">
          <li>
            Use <strong>US</strong> sandbox accounts for both the seller (Business) and the buyer (Personal). A non-US seller leaves every payment stuck as
            &quot;Unclaimed&quot;.
          </li>
          <li>Press &quot;Create test orders&quot; below. It makes four goods-and-services orders on your seller account.</li>
          <li>Open each approve link, log in as the sandbox buyer, and pay. The page then goes to example.com, which is expected.</li>
          <li>Press &quot;Capture approved orders&quot;. Each payment should show COMPLETED. Two of them also get tracking added.</li>
          <li>
            Log in at <span className="break-all">sandbox.paypal.com</span> as the buyer, open each payment, choose Report a problem, and file &quot;I didn&apos;t
            receive my item&quot; or &quot;Item is significantly not as described&quot;.
          </li>
          <li>Wait a few minutes, then press Sync on the Disputes page. New cases can take a few minutes to appear.</li>
          <li>
            To show a PayPal-confirmed result, submit evidence on a case at least 30 minutes before you need it. The Sandbox adjudication tool only appears after
            PayPal has had the case under review for 20 to 30 minutes.
          </li>
        </ol>

        {sandbox && (
          <>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton action={createKitAction} pendingLabel="Creating orders">
                Create test orders
              </ActionButton>
              <ActionButton action={captureKitAction} pendingLabel="Capturing">
                Capture approved orders
              </ActionButton>
            </div>
            {kit.length > 0 && (
              <ul className="mt-5 flex flex-col gap-3">
                {kit.map((o) => (
                  <li key={o.orderId} className="rounded-md border border-rule p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold">{o.item}</span>
                      <span className="num font-bold">{money(Number(o.amount))}</span>
                    </div>
                    <p className="mt-1 text-muted">
                      Order {o.orderId}
                      {o.captureId ? `, payment ${o.captureId} ${o.captureStatus ?? ""}${o.captureReason ? ` (${o.captureReason})` : ""}` : ", not paid yet"}
                      {o.tracking ? `, tracking ${o.tracking}` : ""}
                    </p>
                    {!o.captureId && (
                      <a href={o.approveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sky underline underline-offset-2">
                        Approve as the sandbox buyer
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
