"""Generate deliverables/M1.pdf — Megathon X M1 Approach document.
Team number only at top; double-blind (no team/member/college names).
Run: python3 scripts/make_m1_pdf.py
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

NAVY = HexColor("#0A192F")
GREEN = HexColor("#008A4B")
SLATE = HexColor("#475569")

OUT = os.path.join(os.path.dirname(__file__), "..", "deliverables", "M1.pdf")

styles = {
    "team": ParagraphStyle("team", fontName="Helvetica-Bold", fontSize=11, textColor=GREEN, spaceAfter=2),
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=NAVY, spaceAfter=1),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=13, textColor=SLATE, spaceAfter=6),
    "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=NAVY, spaceBefore=8, spaceAfter=3),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.3, leading=12.6, textColor=HexColor("#1E293B"),
                           alignment=TA_LEFT, spaceAfter=4),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.3, leading=12.6,
                             textColor=HexColor("#1E293B"), leftIndent=10, bulletIndent=2, spaceAfter=2),
    "mono": ParagraphStyle("mono", fontName="Courier", fontSize=8.6, leading=11.6, textColor=SLATE, spaceAfter=4),
}

B = lambda t: Paragraph(t, styles["bullet"], bulletText="•")

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                        topMargin=14 * mm, bottomMargin=14 * mm,
                        title="M1: Approach — Team 292", author="Team 292")

story = [
    Paragraph("Team 292", styles["team"]),
    Paragraph("M1: Approach — Green Finance Assistant", styles["title"]),
    Paragraph("Megathon X: Singularity · PS1 — Green Customer Insights Platform (Lloyds Banking Group)", styles["subtitle"]),
    HRFlowable(width="100%", thickness=1, color=GREEN, spaceAfter=6),

    Paragraph("1. Problem statement and our understanding", styles["h"]),
    Paragraph(
        "Retail banks sit on rich transaction data but have no scalable, trustworthy way to turn it into "
        "green-finance action. PS1 asks for an AI platform that analyses customer transactions, products and "
        "behaviour to: (a) detect opportunities for green financial products — EV finance, green home loans, "
        "solar finance and paperless banking (plus optional green investments and green loans); (b) estimate the "
        "potential sustainability impact of each opportunity; (c) generate personalised sustainability insights "
        "for customers; (d) give business and relationship teams portfolio-level, drill-down insight; "
        "(e) encourage paperless and digital journeys; and (f) explain why every opportunity was identified.",
        styles["body"]),
    Paragraph(
        "Our understanding of the decisive constraint: <b>trust and traceability matter more than model "
        "complexity.</b> Every recommendation must carry evidence, confidence, reason codes and a data "
        "timestamp; products a customer is ineligible for must never be recommended; and impact figures must be "
        "reproducible estimates, not model outputs. We therefore enforce strict separation of concerns: "
        "<b>ML predicts, a deterministic carbon engine calculates, the LLM only explains, and rule-based checks "
        "decide eligibility.</b>", styles["body"]),

    Paragraph("2. Idea / abstract", styles["h"]),
    Paragraph(
        "Green Finance Assistant is an explainable green customer intelligence platform for retail banking in India. "
        "An interpretable weighted-score model computes propensity for each customer × product pair and "
        "decomposes every score into human-readable reason codes backed by transaction evidence. A deterministic "
        "carbon engine converts opportunities into kg CO2e per year using documented emission factors (CEA India "
        "grid baseline 0.82 kg/kWh, IPCC 2006 fuel and gas factors, DEFRA 2023 paper factors), exposing the exact "
        "formula and assumptions behind every figure. A strictly grounded LLM layer narrates these structured "
        "outputs in plain English for customers and relationship managers, with a deterministic template fallback "
        "so the system can never hallucinate offline. A customer-memory layer records responses "
        "(interested / not for me) and re-orders future recommendations without ever mutating propensity, "
        "eligibility or impact. The platform ships as two experiences: a <b>Customer Green Companion</b> "
        "(personal scorecard, opportunities, grounded chat) and a <b>Lloyds Intelligence Console</b> "
        "(portfolio KPIs, segments, searchable customers, drill-down to a single transaction).",
        styles["body"]),

    Paragraph("3. High-level approach, pipeline and architecture", styles["h"]),
    Paragraph(
        "<b>Data.</b> Synthetic Indian retail dataset (fixed seed 42, fully documented generation): 120 fictional "
        "customers, ~13,100 transactions over a trailing 12-month window, each assigned to exactly one of eight "
        "mutually exclusive sustainability categories (Fuel, Electricity, Gas, Public Transport, Home Improvement, "
        "Automotive, Utilities, Other). No real or confidential banking data is used. Injected duplicates exercise "
        "the data-quality path.", styles["body"]),
    Paragraph("<b>Pipeline.</b>", styles["body"]),
    Paragraph(
        "transactions → validation & duplicate flagging → categorisation → customer feature store (12-month "
        "windows) → interpretable propensity model (documented weights, sigmoid squashing) → deterministic "
        "eligibility rules → carbon engine (factor registry + fixed formulas) → recommendation store → LLM "
        "explanation layer (grounded, streaming) → dashboards & API", styles["mono"]),
    B("<b>Propensity model:</b> transparent weighted scoring per product; every weight documented; scores decompose into reason codes (e.g. HIGH_FUEL_SPEND, AGING_ICE_VEHICLE) with evidence strings."),
    B("<b>Eligibility:</b> separate deterministic rules (age, income band, home ownership, existing EV); ineligible products are recorded for audit but never recommended."),
    B("<b>Carbon engine:</b> rules-only module; same code path powers customer estimates and an interactive calculator; outputs labelled 'estimated potential impact'."),
    B("<b>LLM layer:</b> receives only structured model/engine outputs; forbidden from predicting, calculating or implying eligibility; streams explanations and grounded chat answers; deterministic fallback on any failure."),
    B("<b>Stack:</b> FastAPI + MongoDB backend (REST + SSE streaming), React + Tailwind + Recharts frontend, LLM via API. Reproducible from a fixed seed."),

    Paragraph("4. Planned testing methodology", styles["h"]),
    B("<b>Data quality:</b> schema validation, duplicate detection rate, categorisation coverage (target 100%), 12-month window completeness."),
    B("<b>Model evaluation:</b> synthetic take-up labels from a documented, independent noisy rule conditioned on eligibility; customer-level train/validation/test splits via sha256(customer_id) hashing (60/20/20, disjoint — no leakage). Metrics: AUC, precision@k, Brier score, log-loss, reported per product and macro-averaged against random and single-signal baselines, with 95% seeded bootstrap confidence intervals so uncertainty at this sample size is explicit."),
    B("<b>Carbon engine:</b> known-answer unit tests per scenario (EV, solar, home retrofit, paperless) — expected vs actual, run on every evaluation pass."),
    B("<b>Guardrail tests (live):</b> ineligible products are never recommended; every recommendation carries evidence, confidence, reason codes, timestamp and an impact estimate; memory never alters scores, eligibility or impact."),
    B("<b>LLM checks:</b> fallback determinism (identical context → identical narration), number-grounding (every figure in the fallback narration must appear in the structured context), and read-only architecture over stored outputs."),
    B("<b>Reproducibility:</b> fixed seed; dataset regeneration checksum (customers, transactions and amount totals must match the stored dataset)."),
    B("<b>Scenario tests:</b> missing data, ineligible customers and LLM-outage paths exercised via the fallback and guardrail harness."),
    Paragraph(
        "<b>Known limitations (to be reported):</b> synthetic labels measure ranking behaviour against a documented "
        "rule, not real-world take-up; a 120-customer portfolio limits statistical power (surfaced through "
        "bootstrap confidence intervals); impact estimates are gross of rebound effects and behavioural change.",
        styles["body"]),
]

doc.build(story)
print("wrote", os.path.abspath(OUT))
