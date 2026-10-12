from learned import fit_logreg, predict


def test_logreg_learns_separable_signal():
    X = [[i / 20] for i in range(21)]
    y = [1 if x[0] > 0.5 else 0 for x in X]
    w = fit_logreg(X, y, l2=0.1)
    assert w[1] > 0
    assert predict(w, [0.9]) > 0.5 > predict(w, [0.1])


def test_logreg_is_deterministic():
    X = [[0.1, 0.2], [0.4, 0.9], [0.8, 0.3], [0.9, 0.95], [0.2, 0.1]]
    y = [0, 1, 0, 1, 0]
    assert fit_logreg(X, y) == fit_logreg(X, y)
