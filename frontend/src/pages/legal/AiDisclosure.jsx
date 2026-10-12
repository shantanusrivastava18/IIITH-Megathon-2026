import { LegalLayout, Section } from "./LegalLayout";

export default function AiDisclosure() {
  return (
    <LegalLayout eyebrow="Transparency" title="AI disclosure" updated="10 Oct 2026" testid="ai-disclosure-page">
      <Section n="01" title="Where AI is used">
        <p>The <b>explanations</b> on opportunity cards and the <b>Companion chat answers</b> may be written by a large language model (accessed through an OpenAI-compatible API) when a key is configured.</p>
      </Section>
      <Section n="02" title="What the AI cannot do">
        <ul className="list-disc space-y-2 pl-5">
          <li>It does not score customers — a transparent, hand-weighted scoring model does.</li>
          <li>It does not calculate carbon — a deterministic engine with published factors does.</li>
          <li>It does not decide eligibility — fixed product rules do.</li>
        </ul>
      </Section>
      <Section n="03" title="Grounding and limits">
        <p>The model only receives the structured facts shown on screen and is told to use no other numbers. Even so, AI text <b>may be imperfect</b>: wording can be wrong or incomplete. Always rely on the figures in the cards, which come directly from the engine.</p>
        <p>If no key is set, or the model is unavailable, a deterministic template writes the explanation instead. The Evaluation page checks that this fallback is repeatable and uses only grounded numbers.</p>
      </Section>
      <Section n="04" title="AI assistance in building this prototype">
        <p>Parts of the code, interface and documentation were written with help from an AI coding assistant, as credited in the README.</p>
      </Section>
    </LegalLayout>
  );
}
