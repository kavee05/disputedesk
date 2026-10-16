import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { config } from "@/lib/config";
import { canWrite, ensureReady } from "@/lib/app";
import { llm } from "@/lib/agent/llm";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "600", "700", "800"] });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "DisputeDesk",
  description: "An AI agent that defends small online sellers against PayPal disputes. Runs on PayPal Sandbox.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#18214a" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  ensureReady();
  const ai = llm();
  const writable = await canWrite();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
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
      <div className="bg-ink px-4 py-1.5 text-center text-[0.8rem] text-white/90">
        <strong className="font-semibold text-white">PayPal Sandbox.</strong> Test accounts and test money only. Every status comes from a PayPal Sandbox
        response.
      </div>
    );
  }
  return (
    <div className="hatch border-b border-turmeric/30 px-4 py-1.5 text-center text-[0.8rem] text-turmeric-ink">
      <strong className="font-semibold">Demo mode.</strong> PayPal is simulated with fictional cases, so no real or sandbox money moves.
    </div>
  );
}
