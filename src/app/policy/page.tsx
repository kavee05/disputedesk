import { getPolicy } from "@/lib/agent/policy";
import { REASON_LABELS } from "@/lib/cases/model";
import { PageHeader } from "@/components/ui";
import { PolicyForm } from "./policy-form";

export default function PolicyPage() {
  return (
    <>
      <PageHeader
        title="Your policy"
        intro="These rules decide when the agent may act on its own. Anything outside them waits for you. The check is plain code, so the AI cannot talk its way past it."
      />
      <PolicyForm policy={getPolicy()} reasons={Object.entries(REASON_LABELS)} />
    </>
  );
}
