"""Universal Hint Service for Curse The Code - Round 1

Enforces:
1. Exact tournament budget: 15 hints total across all rooms in Round 1 per team.
2. Two-Phase Hint Progression:
   - Phase 1 (Hunting Fragments): Dispatches next sequential uncollected fragment hint (+10s penalty).
   - Phase 2 (Deciphering Clues): Dispatches active sequential clue hint (+30s penalty) with:
     (a) 3D room location prop, (b) puzzle/cipher type, (c) subtle solving guidance.
3. Free Re-Inspection: Re-opening an unlocked hint costs 0s penalty and 0 hint budget.
4. NO CLUE BURNOUT (+180s is strictly forbidden).
"""

from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from psycopg2.extras import RealDictCursor
from app.login.service import get_db_connection
from app.lobby.routes import get_content_data

TOTAL_HINT_BUDGET = 15
FRAGMENT_PENALTY_SECONDS = 10
CLUE_PENALTY_SECONDS = 30

ROOM_FRAGMENTS = {
    "bedroom": [
        "EB01", "EB02", "EB03", "EB04", "EB05", "EB06",
        "EB07", "EB08", "EB09", "EB10", "EB11", "EB12", "EK01"
    ],
    "study": [
        "ES01", "ES02", "ES03", "ES04", "ES05", "ES06",
        "ES07", "ES08", "ES09", "ES10", "ES11", "ES12", "EK02", "EK03"
    ],
    "basement": [
        "EK04", "EK05", "EK06"
    ]
}

ROOM_CLUES = {
    "bedroom": ["R1-01", "R1-02", "R1-03", "R1-04"],
    "study": ["R1-05", "R1-06", "R1-07", "R1-08"],
    "basement": ["R1-09", "R1-10", "R1-FIN"]
}

# Detailed hints for Round 1 Clues
CLUE_HINT_DETAILS = {
    "R1-01": {
        "title": "Lena's Diary",
        "location_prop": "Lena's Diary resting on the bedroom desk.",
        "puzzle_type": "Caesar Shift Cipher",
        "guidance": "Shift each ciphertext letter backward by Lena's age (14th birthday) to decipher the cleartext phrase."
    },
    "R1-02": {
        "title": "Lena's Notebook",
        "location_prop": "Lena's Notebook resting beside the bedside nightstand.",
        "puzzle_type": "Origami Count Reverse Shift",
        "guidance": "Count the paper origami cranes folded for mother, then reverse each letter shift by that exact count."
    },
    "R1-03": {
        "title": "Torn Poster",
        "location_prop": "Torn poster pinned above the bedroom wall.",
        "puzzle_type": "Image Steganography & Inverted Contrast",
        "guidance": "Invert the shadows across the torn canvas edge to reveal the faint charcoal inscription."
    },
    "R1-04": {
        "title": "The Vance Family Portrait",
        "location_prop": "Vance Family Portrait hanging above the bedroom wall.",
        "puzzle_type": "Canvas Inversion & Faint Pigment Deciphering",
        "guidance": "Examine the canvas tear using the visual filter tool in Case Files to read the faint keyword inscribed along the margin."
    },
    "R1-05": {
        "title": "Lena's Tablet",
        "location_prop": "Locked tablet in the study desk drawer (tablet_drawer).",
        "puzzle_type": "8-bit Binary ASCII Decoding",
        "guidance": "Each 8-bit binary block corresponds to a single ASCII character; convert each byte to reveal the recipient name."
    },
    "R1-06": {
        "title": "The Unsent Email",
        "location_prop": "Green glowing CRT monitor on the study desk (crt_monitor).",
        "puzzle_type": "Binary Concatenation & Byte Stream Decoding",
        "guidance": "Concatenate the three binary fragments from left to right without separators, then decode the 8-bit bytes into plain text."
    },
    "R1-07": {
        "title": "Corrupted Log",
        "location_prop": "Terminal PC tower resting on the desk surface (terminal_pc).",
        "puzzle_type": "Memory Dump & Offset Crash Trace",
        "guidance": "Order the three memory crash logs by ascending timestamp, then identify the faulting function address at offset 0xDEAD."
    },
    "R1-08": {
        "title": "Server Access Log",
        "location_prop": "Dot-matrix line printer beside the desk (line_printer).",
        "puzzle_type": "Timestamp Anomaly Detection & Pass Validation",
        "guidance": "Cross-reference access badge timestamps with the building shutdown time; find the badge printed after the facility went dark."
    },
    "R1-09": {
        "title": "Intercom Clearance Relay",
        "location_prop": "Wall-mounted intercom console beside the containment door (intercom).",
        "puzzle_type": "Physical Relay QR Card Authorization",
        "guidance": "Scan the physical emergency clearance QR card provided at your station to retrieve the clearance token for the intercom."
    },
    "R1-10": {
        "title": "The Family's Final Note",
        "location_prop": "Server rack door panel in the central server cluster (rack_door).",
        "puzzle_type": "Vigenère Cipher with Surname Keyword",
        "guidance": "Decrypt the ciphered margin text using the family surname as the repeating Vigenère key."
    },
    "R1-FIN": {
        "title": "Containment Terminal",
        "location_prop": "Central containment terminal console (containment_console).",
        "puzzle_type": "3-Stage Master Override Protocol",
        "guidance": "The door asks for three words you have already been given: one from a girl's page, one from a machine's last words, and one from a guest who should not exist. Match the torn edges of the photograph. Then count what the living cast to uncover the hidden sequence."
    }
}


def get_clue_hint_point_deduction(cur, team_id: int, clue_id: str) -> float:
    """Returns point deduction if a clue hint was unlocked for this clue.
    - R1-FIN: -30 points deduction (awards 70 pts upon solve)
    - Other clues (R1-01 to R1-10): -15 points deduction (awards 85 pts upon solve)
    - If no clue hint was purchased: 0.0 deduction (awards full 100 pts)
    """
    cur.execute(
        """SELECT 1 FROM team_hints
           WHERE team_id = %s AND round = 1 AND target_id = %s AND hint_category = 'clue'
           LIMIT 1""",
        (team_id, clue_id),
    )
    if cur.fetchone():
        return 30.0 if clue_id == "R1-FIN" else 15.0
    return 0.0


def _get_fragment_hint_text(content: Dict[str, Any], room_id: str, fragment_id: str) -> str:
    """Find locate_hint from content, falling back to a clean descriptive string."""
    for r in content.get("rooms", []):
        if r.get("id") == room_id:
            for ev in r.get("evidence", []):
                if ev.get("id") == fragment_id:
                    hint = ev.get("locate_hint")
                    if hint and not hint.startswith("TEST:"):
                        return hint
                    obj = ev.get("hiding", {}).get("object_id", "nearby object")
                    return f"Search carefully around the {obj.replace('_', ' ')} in the {room_id}."
    return f"Search the area around fragment {fragment_id}."


def get_hint_status(team_id: int) -> Dict[str, Any]:
    """Retrieve full hint usage history, current budget remaining, and total penalty seconds."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT id, room_id, hint_category, target_id, penalty_seconds, hint_text, created_at
                   FROM team_hints
                   WHERE team_id = %s AND round = 1
                   ORDER BY created_at ASC""",
                (team_id,),
            )
            hints = cur.fetchall()

            cur.execute(
                "SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = 1",
                (team_id,),
            )
            round_row = cur.fetchone()
            total_penalty = round_row["penalty_seconds"] if round_row and round_row["penalty_seconds"] else 0

    hints_used = len(hints)
    return {
        "total_budget": TOTAL_HINT_BUDGET,
        "hints_used": hints_used,
        "hints_remaining": max(0, TOTAL_HINT_BUDGET - hints_used),
        "total_penalty_seconds": total_penalty,
        "unlocked_hints": [dict(h) for h in hints],
    }


def request_hint(
    team_id: int,
    room_id: Optional[str] = None,
    target_id: Optional[str] = None
) -> Dict[str, Any]:
    """Dispatches a hint according to the two-phase rule with strict budget and time penalties.

    Free Re-Inspection:
    - If `target_id` is supplied and already unlocked, return it for 0 penalty.

    Phase 1 (Hunting Fragments):
    - If any non-decoy fragments remain uncollected in `room_id`, dispatch next uncollected fragment (+10s).

    Phase 2 (Deciphering Clues):
    - If all room fragments collected, dispatch active unsolved clue hint (+30s).
    """
    content = get_content_data()

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Determine active room if not provided
            if not room_id:
                cur.execute(
                    "SELECT room_id, is_completed FROM team_rooms WHERE team_id = %s ORDER BY updated_at DESC",
                    (team_id,),
                )
                rooms_prog = cur.fetchall()
                completed = {r["room_id"] for r in rooms_prog if r["is_completed"]}
                if "bedroom" not in completed:
                    room_id = "bedroom"
                elif "study" not in completed:
                    room_id = "study"
                else:
                    room_id = "basement"

            if room_id not in ROOM_FRAGMENTS:
                raise HTTPException(400, f"Invalid room_id '{room_id}'")

            # 2. Check if the specific target_id requested is ALREADY unlocked
            if target_id:
                cur.execute(
                    """SELECT id, room_id, hint_category, target_id, penalty_seconds, hint_text, created_at
                       FROM team_hints
                       WHERE team_id = %s AND round = 1 AND target_id = %s""",
                    (team_id, target_id),
                )
                existing = cur.fetchone()
                if existing:
                    cur.execute(
                        "SELECT COUNT(*) as count FROM team_hints WHERE team_id = %s AND round = 1",
                        (team_id,),
                    )
                    used_cnt = cur.fetchone()["count"]
                    cur.execute(
                        "SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = 1",
                        (team_id,),
                    )
                    r_row = cur.fetchone()
                    total_pen = r_row["penalty_seconds"] if r_row and r_row["penalty_seconds"] else 0
                    
                    details = CLUE_HINT_DETAILS.get(target_id) if existing["hint_category"] == "clue" else None
                    return {
                        "success": True,
                        "penalty_seconds": 0,
                        "target_id": existing["target_id"],
                        "hint_category": existing["hint_category"],
                        "room_id": existing["room_id"],
                        "hint_text": existing["hint_text"],
                        "hint_details": details,
                        "penalty_applied": 0,
                        "is_free": True,
                        "hints_used": used_cnt,
                        "hints_remaining": max(0, TOTAL_HINT_BUDGET - used_cnt),
                        "total_penalty_seconds": total_pen,
                        "message": "Re-inspected previously unlocked hint (no penalty applied)."
                    }

            # 3. Check current budget
            cur.execute(
                "SELECT COUNT(*) as count FROM team_hints WHERE team_id = %s AND round = 1",
                (team_id,),
            )
            hints_used = cur.fetchone()["count"]
            if hints_used >= TOTAL_HINT_BUDGET:
                raise HTTPException(
                    403,
                    detail={
                        "code": "HINT_BUDGET_EXHAUSTED",
                        "message": f"Tournament hint budget exhausted ({TOTAL_HINT_BUDGET}/{TOTAL_HINT_BUDGET} used).",
                    },
                )

            # 4. Check fragment collection state for this room
            cur.execute(
                "SELECT fragment_id FROM team_fragments WHERE team_id = %s AND room_id = %s",
                (team_id, room_id),
            )
            collected_fragments = {r["fragment_id"] for r in cur.fetchall()}
            expected_fragments = ROOM_FRAGMENTS[room_id]
            uncollected_fragments = [fid for fid in expected_fragments if fid not in collected_fragments]

            # 5. Check if basket is officially unlocked in team_rooms
            cur.execute(
                "SELECT is_basket_unlocked FROM team_rooms WHERE team_id = %s AND room_id = %s",
                (team_id, room_id),
            )
            basket_row = cur.fetchone()
            is_basket_unlocked = bool(basket_row and basket_row["is_basket_unlocked"]) or (len(uncollected_fragments) == 0)

            # ----------------------------------------------------
            # PHASE 1: Hunting Fragments (if fragments remain)
            # ----------------------------------------------------
            if not is_basket_unlocked and uncollected_fragments:
                next_fragment_id = uncollected_fragments[0]

                # Check if this fragment hint was already purchased
                cur.execute(
                    """SELECT id, hint_text FROM team_hints
                       WHERE team_id = %s AND round = 1 AND target_id = %s""",
                    (team_id, next_fragment_id),
                )
                existing_frag = cur.fetchone()
                if existing_frag:
                    # Return cached free hint
                    cur.execute(
                        "SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = 1",
                        (team_id,),
                    )
                    r_row = cur.fetchone()
                    total_pen = r_row["penalty_seconds"] if r_row and r_row["penalty_seconds"] else 0
                    return {
                        "success": True,
                        "penalty_seconds": 0,
                        "target_id": next_fragment_id,
                        "hint_category": "fragment",
                        "room_id": room_id,
                        "hint_text": existing_frag["hint_text"],
                        "hint_details": None,
                        "penalty_applied": 0,
                        "is_free": True,
                        "hints_used": hints_used,
                        "hints_remaining": max(0, TOTAL_HINT_BUDGET - hints_used),
                        "total_penalty_seconds": total_pen,
                        "message": "Re-inspected previously unlocked hint (no penalty applied)."
                    }

                # Unlock new fragment hint
                hint_text = _get_fragment_hint_text(content, room_id, next_fragment_id)
                penalty = FRAGMENT_PENALTY_SECONDS

                cur.execute(
                    """INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                       VALUES (%s, 1, %s, 'fragment', %s, %s, %s)""",
                    (team_id, room_id, next_fragment_id, penalty, hint_text),
                )
                cur.execute(
                    """INSERT INTO team_rounds (team_id, round, penalty_seconds, updated_at)
                       VALUES (%s, 1, %s, NOW())
                       ON CONFLICT (team_id, round)
                       DO UPDATE SET penalty_seconds = team_rounds.penalty_seconds + EXCLUDED.penalty_seconds, updated_at = NOW()
                       RETURNING penalty_seconds""",
                    (team_id, penalty),
                )
                new_total_pen = cur.fetchone()["penalty_seconds"]
                conn.commit()

                return {
                    "success": True,
                    "penalty_seconds": penalty,
                    "target_id": next_fragment_id,
                    "hint_category": "fragment",
                    "room_id": room_id,
                    "hint_text": hint_text,
                    "hint_details": None,
                    "penalty_applied": penalty,
                    "is_free": False,
                    "hints_used": hints_used + 1,
                    "hints_remaining": max(0, TOTAL_HINT_BUDGET - (hints_used + 1)),
                    "total_penalty_seconds": new_total_pen,
                    "message": f"Fragment hint unlocked (+{penalty}s penalty applied)."
                }

            # ----------------------------------------------------
            # PHASE 2: Deciphering Clues (Basket Unlocked)
            # ----------------------------------------------------
            cur.execute(
                "SELECT clue_id, solved, attempts FROM team_clues WHERE team_id = %s AND round = 1",
                (team_id,),
            )
            clues_prog = {r["clue_id"]: r for r in cur.fetchall()}
            expected_clues = ROOM_CLUES[room_id]

            # Find active clue in sequential order
            active_clue_id = None
            for cid in expected_clues:
                prog = clues_prog.get(cid, {"solved": False, "attempts": 0})
                clue_def = next((c for c in content.get("clues", []) if c["id"] == cid), {})
                max_att = clue_def.get("attempts_max", 3)
                is_resolved = bool(prog["solved"] or (max_att is not None and prog["attempts"] >= max_att))
                if not is_resolved:
                    active_clue_id = cid
                    break

            if not active_clue_id:
                # All clues resolved in this room, point to last clue
                active_clue_id = expected_clues[-1]

            # Check if this clue hint was already purchased
            cur.execute(
                """SELECT id, hint_text FROM team_hints
                   WHERE team_id = %s AND round = 1 AND target_id = %s""",
                (team_id, active_clue_id),
            )
            existing_clue = cur.fetchone()
            if existing_clue:
                # Return cached free clue hint
                cur.execute(
                    "SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = 1",
                    (team_id,),
                )
                r_row = cur.fetchone()
                total_pen = r_row["penalty_seconds"] if r_row and r_row["penalty_seconds"] else 0
                return {
                    "success": True,
                    "penalty_seconds": 0,
                    "target_id": active_clue_id,
                    "hint_category": "clue",
                    "room_id": room_id,
                    "hint_text": existing_clue["hint_text"],
                    "hint_details": CLUE_HINT_DETAILS.get(active_clue_id),
                    "penalty_applied": 0,
                    "is_free": True,
                    "hints_used": hints_used,
                    "hints_remaining": max(0, TOTAL_HINT_BUDGET - hints_used),
                    "total_penalty_seconds": total_pen,
                    "message": "Re-inspected previously unlocked hint (no penalty applied)."
                }

            # Unlock new clue hint (+30s penalty)
            clue_details = CLUE_HINT_DETAILS.get(
                active_clue_id,
                {
                    "title": active_clue_id,
                    "location_prop": f"Interactive prop for clue {active_clue_id} in {room_id}.",
                    "puzzle_type": "Cryptographic Puzzle",
                    "guidance": "Review the clue scene text and available fragments."
                }
            )
            rich_hint_text = (
                f"[{clue_details['title']}] Location: {clue_details['location_prop']} | "
                f"Type: {clue_details['puzzle_type']} | Guidance: {clue_details['guidance']}"
            )
            penalty = CLUE_PENALTY_SECONDS

            cur.execute(
                """INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                   VALUES (%s, 1, %s, 'clue', %s, %s, %s)""",
                (team_id, room_id, active_clue_id, penalty, rich_hint_text),
            )
            cur.execute(
                """INSERT INTO team_rounds (team_id, round, penalty_seconds, updated_at)
                   VALUES (%s, 1, %s, NOW())
                   ON CONFLICT (team_id, round)
                   DO UPDATE SET penalty_seconds = team_rounds.penalty_seconds + EXCLUDED.penalty_seconds, updated_at = NOW()
                   RETURNING penalty_seconds""",
                (team_id, penalty),
            )
            new_total_pen = cur.fetchone()["penalty_seconds"]
            conn.commit()

            return {
                "success": True,
                "penalty_seconds": penalty,
                "target_id": active_clue_id,
                "hint_category": "clue",
                "room_id": room_id,
                "hint_text": rich_hint_text,
                "hint_details": clue_details,
                "penalty_applied": penalty,
                "is_free": False,
                "hints_used": hints_used + 1,
                "hints_remaining": max(0, TOTAL_HINT_BUDGET - (hints_used + 1)),
                "total_penalty_seconds": new_total_pen,
                "message": f"Clue hint unlocked (+{penalty}s penalty applied)."
            }
