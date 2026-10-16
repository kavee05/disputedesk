"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCaseAction } from "@/app/actions";

// While PayPal is applying a step, re-read the dispute every few seconds so
// the page shows PayPal's real state as soon as it settles.
export function AutoRefresh({ caseId, everyMs = 6000 }: { caseId: string; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(async () => {
      await refreshCaseAction(caseId);
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [caseId, everyMs, router]);
  return (
    <p className="text-sm text-sky" role="status">
      Checking PayPal for the result every few seconds.
    </p>
  );
}
