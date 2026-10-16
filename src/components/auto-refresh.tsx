"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCaseAction } from "@/app/actions";

// While PayPal is applying a step or reviewing a case, re-read the dispute on
// a timer so the page shows PayPal's real state as soon as it changes.
export function AutoRefresh({ caseId, everyMs = 6000, message }: { caseId: string; everyMs?: number; message: string }) {
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
      {message}
    </p>
  );
}
