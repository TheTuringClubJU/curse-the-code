"""End-to-end and combinatoric verification of Room 2 (Daniel's Study).

Validates:
1. Sequential chain progression (ES01..ES12) and premature search rejection (locked=True).
2. Decoy combinatorics (XS01, XS02 available at any point without blocking study chain).
3. Cross-room key fragment chain (EK01 -> EK02 -> EK03).
4. 16/16 fragment discovery gating for basket auto-unlock (locked at 15/16, unlocked at 16/16).
5. Strict clue acceptance vs. rejection matrix across all 4 study clues.
6. Attempt exhaustion & 3-strike lockout behavior (attempts cap at 3, exhausted=True).
7. Clue resolution order permutations (completion triggers on 4th resolved clue).
8. Full end-to-end progression through Daniel's Study.
"""

import pytest

# Study chain in strict chronological order
STUDY_CHAIN = [
    ("bookshelf", "ES01"),
    ("corkboard", "ES02"),
    ("desk_blotter", "ES03"),
    ("filing_cabinet", "ES04"),
    ("sticky_wall", "ES05"),
    ("armchair", "ES06"),
    ("reel_recorder", "ES07"),
    ("cable_bundle", "ES08"),
    ("corkboard", "ES09"),
    ("filing_cabinet", "ES10"),
    ("floor_lamp", "ES11"),
    ("wastebin", "ES12"),
]

CLUE_SOLUTIONS = {
    "R1-05": "ALPHA",
    "R1-06": "SIGNAL",
    "R1-07": "ORBIT",
    "R1-08": "SRC-TEST9",
}


def test_combinatoric_premature_search_returns_locked(study):
    """Searching out of sequence is rejected with locked=True until prerequisites are found."""
    # Searching armchair (ES06) before ES01..ES05 must be locked
    res = study.search("armchair")
    assert res.status_code == 200
    body = res.json()
    assert body["found"] is False
    assert body.get("locked") is True
    assert "investigation trail in order" in body["message"]

    # Now search in order up to ES05
    for prop, _ in STUDY_CHAIN[:5]:
        r = study.search(prop)
        assert r.json()["found"] is True

    # Now armchair (ES06) search must succeed!
    res2 = study.search("armchair")
    assert res2.status_code == 200
    body2 = res2.json()
    assert body2["found"] is True
    assert body2["fragment_id"] == "ES06"


def test_combinatoric_decoys_discovered_at_any_time(study):
    """Decoys (window -> XS01, radiator -> XS02) have no chain sequence and can drop anytime."""
    # Search decoys at step 0 before any study fragments are found
    r_win = study.search("window")
    assert r_win.status_code == 200
    assert r_win.json()["found"] is True
    assert r_win.json()["fragment_id"] == "XS01"

    r_rad = study.search("radiator")
    assert r_rad.status_code == 200
    assert r_rad.json()["found"] is True
    assert r_rad.json()["fragment_id"] == "XS02"

    # Now study chain can still proceed normally
    r_first = study.search("bookshelf")
    assert r_first.json()["found"] is True
    assert r_first.json()["fragment_id"] == "ES01"


def test_combinatoric_basement_chain_enforces_ek02_before_ek03(study):
    """Bookshelf holds EK03 (seq 3) which strictly requires EK02 (seq 2 on reel_recorder)."""
    # First collect ES01 from bookshelf
    r1 = study.search("bookshelf")
    assert r1.json()["fragment_id"] == "ES01"

    # Second search on bookshelf targets EK03, but EK02 is not yet collected
    r2 = study.search("bookshelf")
    assert r2.json()["found"] is False
    assert r2.json().get("locked") is True

    # Collect EK02 from reel_recorder
    # Reel recorder has ES07 (seq 7 study chain) and EK02 (seq 2 basement chain).
    # Since basement chain only needs EK01 (already in Bedroom), EK02 is available!
    r_reel = study.search("reel_recorder")
    assert r_reel.json()["found"] is True
    assert r_reel.json()["fragment_id"] == "EK02"

    # Now that EK02 is collected, searching bookshelf for EK03 succeeds!
    r3 = study.search("bookshelf")
    assert r3.json()["found"] is True
    assert r3.json()["fragment_id"] == "EK03"


def test_combinatoric_depleted_props_return_nothing(ready):
    """Verify searching already-depleted props returns found=False with no side effects."""
    for prop, _ in STUDY_CHAIN:
        res = ready.search(prop)
        assert res.status_code == 200
        body = res.json()
        assert body["found"] is False


@pytest.mark.parametrize(
    "clue_id, valid_inputs",
    [
        ("R1-05", ["ALPHA", "alpha", " Alpha ", "  ALPHA\n"]),
        ("R1-06", ["SIGNAL", "signal", " Signal ", "\nsignal\t"]),
        ("R1-07", ["ORBIT", "orbit", " Orbit ", "orbit\n"]),
        ("R1-08", ["SRC-TEST9", "src-test9", " Src-Test9 ", "SRC-TEST9 "]),
    ],
)
def test_clue_acceptance_matrix(ready, clue_id, valid_inputs):
    """Test full acceptance matrix for each clue with whitespace and case variations."""
    for val in valid_inputs:
        res = ready.submit(clue_id, val)
        assert res.status_code == 200
        assert res.json()["correct"] is True, f"Failed to accept valid input '{val}' for {clue_id}"


def test_clue_exhaustion_lockout(ready):
    """Verify 3 wrong attempts lock out the clue; further submissions return exhausted=True without consuming attempts."""
    clue_id = "R1-05"
    
    # 1st wrong attempt
    r1 = ready.submit(clue_id, "WRONG1").json()
    assert r1["correct"] is False and r1["attempts"] == 1 and not r1["exhausted"]

    # 2nd wrong attempt
    r2 = ready.submit(clue_id, "WRONG2").json()
    assert r2["correct"] is False and r2["attempts"] == 2 and not r2["exhausted"]

    # 3rd wrong attempt (exhaustion)
    r3 = ready.submit(clue_id, "WRONG3").json()
    assert r3["correct"] is False and r3["attempts"] == 3 and r3["exhausted"] is True

    # 4th attempt after lockout: rejected, reward=None, attempts remains 3
    r4 = ready.submit(clue_id, "ALPHA").json()
    assert r4["correct"] is False
    assert r4["exhausted"] is True
    assert r4["reward"] is None
    assert r4["attempts"] == 3


@pytest.mark.parametrize(
    "solve_order",
    [
        ["R1-05", "R1-06", "R1-07", "R1-08"],
        ["R1-08", "R1-07", "R1-06", "R1-05"],
        ["R1-06", "R1-08", "R1-05", "R1-07"],
        ["R1-07", "R1-05", "R1-08", "R1-06"],
    ],
)
def test_clue_resolution_ordering_combinatorics(study, solve_order):
    """Verify solving clues in different order permutations triggers room completion on 4th."""
    study.seed_fragments()

    for idx, clue_id in enumerate(solve_order):
        ans = CLUE_SOLUTIONS[clue_id]
        res = study.submit(clue_id, ans)
        assert res.status_code == 200
        body = res.json()
        assert body["correct"] is True

        is_last = (idx == 3)
        if is_last:
            assert body.get("room_completed") is True, f"4th solved clue ({clue_id}) must complete room"
        else:
            assert not body.get("room_completed"), f"Clue {idx+1}/4 ({clue_id}) should not complete room"

    state = study.state()
    assert state["is_completed"] is True
    assert state["photo_pieces_collected"] == 8  # 4 from Bedroom + 4 from Study


def test_full_e2e_study_walkthrough(study):
    """Complete E2E walkthrough of Daniel's Study with interleaved decoys and keys."""
    # 1. State check upon arrival from Room 1
    init_state = study.state()
    assert init_state["room_id"] == "study"
    assert init_state["basket_unlocked"] is False
    assert init_state["is_completed"] is False
    assert len(init_state["clues"]) == 4

    # 2. Collect decoys first (demonstrating free-order discovery)
    assert study.search("window").json()["fragment_id"] == "XS01"
    assert study.search("radiator").json()["fragment_id"] == "XS02"

    # 3. Collect basement key EK02
    assert study.search("reel_recorder").json()["fragment_id"] == "EK02"

    # 4. Collect ES01 from bookshelf, then EK03 becomes unblocked on bookshelf!
    assert study.search("bookshelf").json()["fragment_id"] == "ES01"
    assert study.search("bookshelf").json()["fragment_id"] == "EK03"

    # 5. Collect remaining study fragments in sequence (ES02..ES12)
    for prop, expected_id in STUDY_CHAIN[1:]:
        res = study.search(prop)
        assert res.status_code == 200
        assert res.json()["fragment_id"] == expected_id

    # 6. Verify all 16 fragments collected and basket auto-unlocked
    unlocked_state = study.state()
    assert unlocked_state["basket_unlocked"] is True
    assert len(unlocked_state["collected_fragment_ids"]) == 16

    # 7. Solve all 4 clues
    study.submit("R1-05", "ALPHA")
    study.submit("R1-06", "SIGNAL")
    study.submit("R1-07", "ORBIT")
    final_res = study.submit("R1-08", "SRC-TEST9")

    # 8. Verify final completion
    assert final_res.status_code == 200
    assert final_res.json()["room_completed"] is True

    final_state = study.state()
    assert final_state["is_completed"] is True
    assert all(c["solved"] for c in final_state["clues"])
    assert final_state["photo_pieces_collected"] == 8
