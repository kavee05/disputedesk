import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import { config } from "@/lib/config";
import { canWrite, ensureReady } from "@/lib/app";
import { llm } from "@/lib/agent/llm";
import { Nav } from "@/components/nav";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "700", "800"] });
const body = Atkinson_Hyperlegible({ subsets: ["latin"], variable: "--font-atkinson", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "DisputeDesk",
  description: "An AI agent that defends small online sellers against PayPal disputes. Runs on PayPal Sandbox.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f2a5c" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  ensureReady();
  const ai = llm();
  const writable = await canWrite();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <ModeStrip />
        <div className="mx-auto flex max-w-[1240px] flex-col md:flex-row">
          <Nav aiLabel={ai ? ai.label : "Offline rules (no AI key)"} readOnly={!writable} />
          <main className="min-w-0 flex-1 px-4 pb-16 pt-5 md:px-8 md:pt-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

function ModeStrip() {
  if (config.mode === "sandbox") {
    return (
      <div className="bg-ink px-4 py-2 text-center text-sm text-white">
        <strong>PayPal Sandbox.</strong> Test accounts and test money only. Every status shown comes from a PayPal Sandbox response.
      </div>
    );
  }
  return (
    <div className="hatch border-b border-turmeric/40 px-4 py-2 text-center text-sm text-turmeric-ink">
      <strong>Demo mode.</strong> PayPal is simulated with fictional cases, so no real or sandbox money moves. Add sandbox keys to use the real PayPal path.
    </div>
  );
}
