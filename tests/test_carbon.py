import pytest

from carbon import calculate_scenario
from evaluation import CARBON_KNOWN_ANSWERS

PUBLIC_VECTORS = [
    ("ev", {"annual_km": 15000, "kmpl": 15}, 588.0),
    ("ev", {"annual_km": 20000, "kmpl": 12}, 1554.0),
    ("ev", {"annual_km": 8000, "kmpl": 18}, 108.3),
    ("solar", {"monthly_kwh": 300, "roof_kw": 3}, 2952.0),
    ("solar", {"monthly_kwh": 200, "roof_kw": 5}, 1968.0),
    ("solar", {"monthly_kwh": 500, "roof_kw": 3}, 3542.4),
    ("green_home", {"monthly_kwh": 300, "monthly_gas_scm": 6}, 464.8),
    ("green_home", {"monthly_kwh": 450, "monthly_gas_scm": 10}, 700.9),
    ("paperless", {"statements_per_month": 2, "branch_visits_per_month": 2}, 11.0),
    ("paperless", {"statements_per_month": 5, "branch_visits_per_month": 0}, 1.2),
    ("paperless", {"statements_per_month": 1, "branch_visits_per_month": 4}, 21.4),
]


@pytest.mark.parametrize("scenario,inputs,expected", CARBON_KNOWN_ANSWERS)
def test_known_answer_unit_tests(scenario, inputs, expected):
    assert calculate_scenario(scenario, inputs)["kg_co2e_per_year"] == pytest.approx(expected, abs=0.15)


@pytest.mark.parametrize("scenario,inputs,expected", PUBLIC_VECTORS)
def test_public_vectors(scenario, inputs, expected):
    assert calculate_scenario(scenario, inputs)["kg_co2e_per_year"] == pytest.approx(expected, abs=0.15)


def test_engine_is_deterministic():
    a = calculate_scenario("solar", {"monthly_kwh": 300, "roof_kw": 3})
    b = calculate_scenario("solar", {"monthly_kwh": 300, "roof_kw": 3})
    assert a == b
