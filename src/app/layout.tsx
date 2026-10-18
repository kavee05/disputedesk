import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { config } from "@/lib/config";
import { canWrite, ensureReady } from "@/lib/app";
import { llm } from "@/lib/agent/llm";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "DisputeDesk",
  description: "An AI agent that defends small online sellers against PayPal disputes. Runs on PayPal Sandbox.",
  authors: [{ name: "Kaveetiran A/L Sitambaram" }],
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#eceef4" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  ensureReady();
  const ai = llm();
  const writable = await canWrite();
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-lift)]"
        >
          Skip to content
        </a>
        <ModeStrip />
        <AppShell mode={config.mode} aiLabel={ai ? ai.label : "Offline rules (no AI key)"} readOnly={!writable}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

function ModeStrip() {
  if (config.mode === "sandbox") {
    return (
      <div className="bg-ink px-4 py-1.5 text-center text-[0.78rem] text-white/85">
        <strong className="font-semibold text-white">PayPal Sandbox.</strong> Test accounts and test money only. Every status comes from a PayPal Sandbox
        response.
      </div>
    );
  }
  return (
    <div className="hatch px-4 py-1.5 text-center text-[0.78rem] text-turmeric-ink">
      <strong className="font-semibold">Demo mode.</strong> PayPal is simulated with fictional cases, so no real or sandbox money moves.
    </div>
  );
}
