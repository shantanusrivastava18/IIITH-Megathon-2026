from propensity import check_eligibility


def _recommended(opps):
    return [o for o in opps if o["recommended"]]


def test_ineligible_products_never_recommended(dataset):
    _, _, opps = dataset
    assert all(o["eligible"] for o in _recommended(opps))
    for o in opps:
        if not o["eligible"]:
            assert o["recommended"] is False and o["propensity"] is None and o["impact"] is None


def test_every_recommendation_has_reason_codes_and_evidence(dataset):
    _, _, opps = dataset
    recs = _recommended(opps)
    assert recs
    for o in recs:
        assert o["reason_codes"], o
        assert all(rc["code"] and rc["evidence"] for rc in o["reason_codes"])


def test_every_recommendation_has_impact_confidence_and_timestamp(dataset):
    _, _, opps = dataset
    for o in _recommended(opps):
        assert o["impact"] is not None
        assert 0 < o["confidence"] <= 1
        assert o["data_timestamp"]


def _cust(**kw):
    base = {"age": 35, "income_band": "10_18L", "home_owner": True,
            "vehicle": {"fuel_type": "Petrol"}}
    return {**base, **kw}


def test_eligibility_rules():
    assert check_eligibility(_cust(age=19), "ev_finance")[0] is False
    assert check_eligibility(_cust(vehicle={"fuel_type": "EV"}), "ev_finance")[0] is False
    assert check_eligibility(_cust(home_owner=False), "solar")[0] is False
    assert check_eligibility(_cust(home_owner=False), "green_home")[0] is False
    assert check_eligibility(_cust(income_band="5_10L"), "green_invest")[0] is False
    assert check_eligibility(_cust(income_band="under_5L"), "green_loan")[0] is False
    assert check_eligibility(_cust(), "solar")[0] is True
