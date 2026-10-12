import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout eyebrow="Legal" title="Terms & Disclaimer" updated="10 Oct 2026" testid="terms-page">
      <Section n="01" title="What this service is">
        <p>Green Finance Assistant is a demonstration prototype built for a hackathon. It shows how banking transactions could be turned into explainable green-finance suggestions. It is not a live banking product and is not operated by any bank.</p>
      </Section>
      <Section n="02" title="Not an offer, not advice">
        <ul className="list-disc space-y-2 pl-5">
          <li>Recommendations are <b>informational only</b>. They are not a loan offer, a credit decision or an approval.</li>
          <li>Eligibility is decided separately, by deterministic product rules in this prototype and by the bank in any real product.</li>
          <li>Nothing on this site is financial, investment, tax or legal advice.</li>
        </ul>
      </Section>
      <Section n="03" title="Estimates are not guarantees">
        <p>Carbon figures are <b>indicative estimates</b> calculated from published emission factors (CEA, IPCC, DEFRA) and documented assumptions. They are gross of rebound effects and real-world savings will differ. See the <Link to="/methodology" className="font-semibold text-moss underline underline-offset-4">Methodology</Link> for every formula.</p>
        <p>Propensity scores come from a transparent scoring model evaluated on synthetic labels. They show ranking consistency, not real-world accuracy.</p>
      </Section>
      <Section n="04" title="Acceptable use">
        <p>You may explore, test and inspect the prototype. Please do not upload real personal or financial data, attempt to disrupt the service, or present its output as a real bank's decision.</p>
      </Section>
      <Section n="05" title="Intellectual property">
        <p>The source code is released under the MIT License. Third-party libraries, data sources and images remain the property of their owners; see <Link to="/credits" className="font-semibold text-moss underline underline-offset-4">Credits</Link>. Bank and event names are used only to describe the challenge.</p>
      </Section>
      <Section n="06" title="Limitation of liability">
        <p>The prototype is provided "as is", without warranty of any kind. To the fullest extent permitted by law, the authors are not liable for any loss arising from its use.</p>
      </Section>
      <Section n="07" title="Governing law">
        <p>These terms are governed by the laws of India. Placeholder contact for questions: <span className="font-mono">legal@example.org</span> (dummy address).</p>
      </Section>
    </LegalLayout>
  );
}
