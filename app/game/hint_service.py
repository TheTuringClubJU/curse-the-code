import json
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import psycopg2
from fastapi import HTTPException
from app.db import get_db_connection
from app.lobby.routes import get_content_data
from app.game.memory_store import (
    IN_MEMORY_FRAGMENTS,
    IN_MEMORY_ROOMS,
    IN_MEMORY_CLUES,
    IN_MEMORY_HINTS,
    IN_MEMORY_ROUND_PENALTIES,
)
from psycopg2.extras import RealDictCursor

_MEM_HINT_LOCK = threading.Lock()

DEFAULT_ROUND_HINT_BUDGET = 15
TOTAL_HINT_BUDGET = DEFAULT_ROUND_HINT_BUDGET
ROUND_HINT_BUDGET = {
    1: 15,
    2: 15,
}
FRAGMENT_PENALTY_SECONDS = 10
CLUE_PENALTY_SECONDS = 30

ROOM_TO_ROUND = {
    "bedroom": 1,
    "study": 1,
    "basement": 1,
    "records": 2,
    "control": 2,
    "vault": 2,
}

ROOM_FRAGMENTS = {
    "bedroom": [
        "EB01", "EB02", "EB03", "EB04", "EB05", "EB06",
        "EB07", "EB08", "EB09", "EB10", "EB11", "EB12", "EK01", "XB01", "XB02"
    ],
    "study": [
        "ES01", "ES02", "ES03", "ES04", "ES05", "ES06",
        "ES07", "ES08", "ES09", "ES10", "ES11", "ES12", "EK02", "EK03", "XS01", "XS02"
    ],
    "basement": [
        "EK04", "EK05", "EK06", "XK01", "XK02"
    ],
    "records": [
        "ER01", "ER02", "ER03", "ER04", "ER05", "ER06", "ER07", "ER08", "ER09", "ER10", "XR01", "XR02"
    ],
    "control": [
        "EC01", "EC02", "EC03", "EC04", "EC05", "EC06", "EC07", "EC08", "XC01", "XC02"
    ],
    "vault": []
}

ROOM_CLUES = {
    "bedroom": ["R1-01", "R1-02", "R1-03", "R1-04"],
    "study": ["R1-05", "R1-06", "R1-07", "R1-08"],
    "basement": ["R1-09", "R1-10", "R1-FIN"],
    "records": ["R2-02", "R2-03", "R2-04", "R2-07"],
    "control": ["R2-01", "R2-05", "R2-06"],
    "vault": ["R2-08", "R2-09", "R2-10"],
}

# Detailed hints for Clues
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
    },
    "R2-01": {
        "title": "Personnel Index",
        "location_prop": "Staff Terminal console in Control Bay 5B (staff_terminal).",
        "puzzle_type": "Unix Epoch Conversion & Anomaly Filtering",
        "guidance": "Convert the machine timestamps in your recovered cards from Unix epoch seconds, cross-reference termination dates in the personnel register, and flag any anomalous post-closure login."
    },
    "R2-02": {
        "title": "Flooded Index Registry",
        "location_prop": "Rotting library shelves in the archive sub-basement.",
        "puzzle_type": "Waterlogged Ledger Cross-Reference",
        "guidance": "Reconstruct the blurred index entries using surviving shelf tags. Identify the accession number matching the transfer order."
    },
    "R2-03": {
        "title": "Microfiche Reader",
        "location_prop": "Illuminated microfiche projector in the catalog aisle.",
        "puzzle_type": "Optical Grid Decryption",
        "guidance": "Align the microfilm reel markers with the ledger coordinates to reveal the redacted project clearance."
    },
    "R2-04": {
        "title": "Card Catalog Drawer",
        "location_prop": "Solid brass card catalog cabinet against the south wall.",
        "puzzle_type": "Dewey-Hex Decimal Cross-Indexing",
        "guidance": "Convert the Dewey-Hex notation on the requisition slip to identify the vault bulkhead sequence number."
    },
    "R2-05": {
        "title": "Transmission Archive",
        "location_prop": "Radio Console in Control Bay 5B (radio_console).",
        "puzzle_type": "Base64 Header Authentication & Spoof Detection",
        "guidance": "Decode the X-Auth headers attached to each intercepted transmission and match them against the verified operator badge uncovered from the Personnel Index."
    },
    "R2-06": {
        "title": "Voicemail Spectrogram",
        "location_prop": "Sound Console in Control Bay 5B (sound_console).",
        "puzzle_type": "Audio Frequency Spectrogram Inspection",
        "guidance": "Inspect the upper-frequency spectrogram of the authentic voicemail file identified in the Radio Console archive to reveal the hidden code."
    },
    "R2-07": {
        "title": "Vault Bulkhead Gate",
        "location_prop": "Heavy hydraulic containment door leading to the Anointing Vault.",
        "puzzle_type": "Hydraulic Interlock Release",
        "guidance": "Verify all upstream record clearances to disengage the magnetic interlock seal."
    },
    "R2-08": {
        "title": "Shutdown Manual Diff",
        "location_prop": "Manual terminal in the Western Scriptorium lectern (Sector 6C).",
        "puzzle_type": "Procedure Manual Comparison (Vigenère Diff)",
        "guidance": "Compare the original manual v1.1 against Corvin's tampered v2.0 revision line by line. Identify the step numbers that were tampered with."
    },
    "R2-09": {
        "title": "Failsafe Circuit",
        "location_prop": "Failsafe knife-switch panel in the Eastern Switchgear (Sector 6D).",
        "puzzle_type": "Logic Gate Circuit Evaluation",
        "guidance": "Derive the 8 binary switch inputs from the voicemail digits. Trace signal flow through NOT, AND, and OR gates to find the 4-digit lamp authorization code."
    },
    "R2-10": {
        "title": "Central Containment Console",
        "location_prop": "Central Altar Monolith Console in the Anointing Nave (Sector 6B).",
        "puzzle_type": "Grand Finale Tri-Fold Authorization",
        "guidance": "Simultaneously enter the clean procedure steps from R2-08, the failsafe authorization code from R2-09, and the real sender badge (BDG-9001)."
    }
}


def get_clue_hint_point_deduction(cur, team_id: int, clue_id: str) -> float:
    """Returns point deduction if a clue hint was unlocked for this clue.
    - R1-FIN / R2-10: -30 points deduction (awards 70 pts upon solve)
    - Other clues: -15 points deduction (awards 85 pts upon solve)
    - If no clue hint was purchased: 0.0 deduction (awards full 100 pts)
    """
    round_num = 2 if clue_id.startswith("R2-") else 1
    cur.execute(
        """SELECT 1 FROM team_hints
           WHERE team_id = %s AND round = %s AND target_id = %s AND hint_category = 'clue'
           LIMIT 1""",
        (team_id, round_num, clue_id),
    )
    if cur.fetchone():
        return 30.0 if clue_id in ("R1-FIN", "R2-10") else 15.0
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


def _parse_json_list(val: Any) -> List[Dict[str, Any]]:
    if val is None:
        return []
    if isinstance(val, str):
        return json.loads(val)
    return list(val)


def _resolve_active_room_from_rows(rooms_prog: List[Dict[str, Any]]) -> str:
    completed = {r["room_id"] for r in rooms_prog if r.get("is_completed")}
    for candidate in ("bedroom", "study", "basement", "records", "control"):
        if candidate not in completed:
            return candidate
    return "vault"


def _build_hint_status_from_bundle(
    target_round: int,
    total_penalty: int,
    hints: List[Dict[str, Any]],
    fragments: List[Dict[str, Any]],
    clues: List[Dict[str, Any]],
    content: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build enriched hint status dict purely in memory from fetched DB/in-memory rows."""
    if content is None:
        content = get_content_data()
    budget = ROUND_HINT_BUDGET.get(target_round, DEFAULT_ROUND_HINT_BUDGET)

    collected_by_room: Dict[str, set] = {}
    for row in fragments:
        collected_by_room.setdefault(row["room_id"], set()).add(row["fragment_id"])

    clues_prog = {r["clue_id"]: r for r in clues}
    clue_defs = {c.get("id"): c for c in content.get("clues", []) if c.get("id")}
    frag_titles: Dict[str, str] = {}
    for r in content.get("rooms", []):
        for ev in r.get("evidence", []):
            if ev.get("id"):
                frag_titles[ev["id"]] = (
                    ev.get("display", {}).get("title")
                    or ev.get("label")
                    or ev["id"]
                )

    enriched: List[Dict[str, Any]] = []
    active_hints: List[Dict[str, Any]] = []
    archived_hints: List[Dict[str, Any]] = []

    for h in hints:
        hd = dict(h)
        tid = hd["target_id"]
        h_room = hd["room_id"]
        cat = hd["hint_category"]

        if cat == "fragment":
            is_resolved = tid in collected_by_room.get(h_room, set())
            target_title = frag_titles.get(tid, tid)
            details = None
        else:
            c_def = clue_defs.get(tid, {})
            c_prog = clues_prog.get(tid, {"solved": False, "attempts": 0})
            max_att = c_def.get("attempts_max", 3)
            is_resolved = bool(c_prog.get("solved") or (max_att is not None and c_prog.get("attempts", 0) >= max_att))
            details = CLUE_HINT_DETAILS.get(tid)
            target_title = (details or {}).get("title") or c_def.get("title") or tid

        hd["is_resolved"] = is_resolved
        hd["is_active"] = not is_resolved
        hd["status"] = "archived" if is_resolved else "active"
        hd["target_title"] = target_title
        hd["hint_details"] = details
        if hd.get("created_at") is not None and hasattr(hd["created_at"], "isoformat"):
            hd["created_at"] = hd["created_at"].isoformat()

        enriched.append(hd)
        if hd["is_active"]:
            active_hints.append(hd)
        else:
            archived_hints.append(hd)

    hints_used = len(enriched)
    return {
        "round": target_round,
        "round_budget": budget,
        "total_budget": budget,
        "hints_used": hints_used,
        "hints_remaining": max(0, budget - hints_used),
        "total_penalty_seconds": total_penalty or 0,
        "unlocked_hints": enriched,
        "active_hints": active_hints,
        "archived_hints": archived_hints,
    }


def _enrich_hint_status(
    cur,
    team_id: int,
    target_round: int,
    content: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build full hint status including Active vs Archived state for a team & round."""
    cur.execute(
        """SELECT id, room_id, hint_category, target_id, penalty_seconds, hint_text, created_at
           FROM team_hints
           WHERE team_id = %s AND round = %s
           ORDER BY created_at ASC, id ASC""",
        (team_id, target_round),
    )
    hints = cur.fetchall()

    cur.execute(
        "SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = %s",
        (team_id, target_round),
    )
    round_row = cur.fetchone()
    total_penalty = round_row["penalty_seconds"] if round_row and round_row["penalty_seconds"] else 0

    cur.execute(
        "SELECT room_id, fragment_id FROM team_fragments WHERE team_id = %s",
        (team_id,),
    )
    fragments = cur.fetchall()

    cur.execute(
        "SELECT clue_id, solved, attempts FROM team_clues WHERE team_id = %s AND round = %s",
        (team_id, target_round),
    )
    clues = cur.fetchall()

    return _build_hint_status_from_bundle(target_round, total_penalty, hints, fragments, clues, content=content)


def _fetch_hint_bundle(cur, team_id: int, target_round: int) -> Dict[str, Any]:
    """Fetch all hint, penalty, fragment, clue, and room state for a team in ONE SQL round-trip."""
    cur.execute(
        """SELECT
               COALESCE((SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = %s), 0) AS total_penalty,
               COALESCE((
                   SELECT json_agg(row_to_json(h) ORDER BY h.created_at ASC, h.id ASC)
                   FROM (
                       SELECT id, room_id, hint_category, target_id, penalty_seconds, hint_text, created_at
                       FROM team_hints
                       WHERE team_id = %s AND round = %s
                   ) h
               ), '[]'::json) AS hints,
               COALESCE((
                   SELECT json_agg(json_build_object('room_id', room_id, 'fragment_id', fragment_id))
                   FROM team_fragments
                   WHERE team_id = %s
               ), '[]'::json) AS fragments,
               COALESCE((
                   SELECT json_agg(json_build_object('clue_id', clue_id, 'solved', solved, 'attempts', attempts))
                   FROM team_clues
                   WHERE team_id = %s AND round = %s
               ), '[]'::json) AS clues,
               COALESCE((
                   SELECT json_agg(json_build_object('room_id', room_id, 'is_completed', is_completed, 'is_basket_unlocked', is_basket_unlocked) ORDER BY id DESC)
                   FROM team_rooms
                   WHERE team_id = %s
               ), '[]'::json) AS rooms""",
        (team_id, target_round, team_id, target_round, team_id, team_id, target_round, team_id),
    )
    row = cur.fetchone() or {}
    return {
        "total_penalty": row.get("total_penalty") or 0,
        "hints": _parse_json_list(row.get("hints")),
        "fragments": _parse_json_list(row.get("fragments")),
        "clues": _parse_json_list(row.get("clues")),
        "rooms": _parse_json_list(row.get("rooms")),
    }


def _atomic_insert_hint(
    conn,
    cur,
    team_id: int,
    round_num: int,
    room_id: str,
    hint_category: str,
    target_id: str,
    penalty: int,
    hint_text: str,
    persist_basket: bool = False,
) -> Dict[str, Any]:
    """Atomically insert hint + increment penalty (and optionally persist basket unlock) in ONE CTE query."""
    basket_cte = (
        """basket_upd AS (
               INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
               VALUES (%s, %s, TRUE)
               ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE
           ),
        """
        if persist_basket
        else ""
    )
    sql = f"""
        WITH {basket_cte}ins AS (
            INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (team_id, round, target_id) DO NOTHING
            RETURNING id, room_id, hint_category, target_id, penalty_seconds, hint_text, created_at
        ),
        upd AS (
            INSERT INTO team_rounds (team_id, round, penalty_seconds, updated_at)
            SELECT %s, %s, %s, NOW()
            FROM ins
            ON CONFLICT (team_id, round)
            DO UPDATE SET penalty_seconds = team_rounds.penalty_seconds + EXCLUDED.penalty_seconds, updated_at = NOW()
            RETURNING penalty_seconds
        )
        SELECT
            (SELECT row_to_json(ins) FROM ins) AS inserted_hint,
            (SELECT penalty_seconds FROM upd) AS new_total_penalty
    """
    params: List[Any] = []
    if persist_basket:
        params.extend([team_id, room_id])
    params.extend([team_id, round_num, room_id, hint_category, target_id, penalty, hint_text])
    params.extend([team_id, round_num, penalty])

    try:
        cur.execute(sql, tuple(params))
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        cur.execute(
            "INSERT INTO rounds (round, status) VALUES (%s, 'pending') ON CONFLICT (round) DO NOTHING",
            (round_num,),
        )
        cur.execute(sql, tuple(params))

    row = cur.fetchone() or {}
    inserted_hint = row.get("inserted_hint")
    if isinstance(inserted_hint, str):
        inserted_hint = json.loads(inserted_hint)
    return {
        "inserted_hint": inserted_hint,
        "new_total_penalty": row.get("new_total_penalty"),
    }


def _in_memory_bundle(team_id: int, target_round: int) -> Dict[str, Any]:
    hints = [
        h for h in IN_MEMORY_HINTS
        if h.get("team_id") == team_id and h.get("round") == target_round
    ]
    fragments = [
        {"room_id": f["room_id"], "fragment_id": f["fragment_id"]}
        for f in IN_MEMORY_FRAGMENTS
        if f.get("team_id") == team_id
    ]
    clues = [
        {"clue_id": cid, "solved": bool(v.get("solved")), "attempts": int(v.get("attempts", 0))}
        for (tid, cid), v in IN_MEMORY_CLUES.items()
        if tid == team_id
    ]
    rooms = [
        {
            "room_id": rid,
            "is_completed": bool(v.get("is_completed")),
            "is_basket_unlocked": bool(v.get("is_basket_unlocked")),
        }
        for (tid, rid), v in IN_MEMORY_ROOMS.items()
        if tid == team_id
    ]
    return {
        "total_penalty": IN_MEMORY_ROUND_PENALTIES.get((team_id, target_round), 0),
        "hints": hints,
        "fragments": fragments,
        "clues": clues,
        "rooms": rooms,
    }


def get_hint_status(team_id: int, room_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve full hint usage history (active + archived), current budget remaining, and total penalty seconds."""
    content = get_content_data()
    conn = get_db_connection()
    if not conn:
        with _MEM_HINT_LOCK:
            if room_id and room_id in ROOM_TO_ROUND:
                target_round = ROOM_TO_ROUND[room_id]
            else:
                rooms = [
                    {"room_id": rid, "is_completed": bool(v.get("is_completed"))}
                    for (tid, rid), v in IN_MEMORY_ROOMS.items()
                    if tid == team_id
                ]
                active_r = _resolve_active_room_from_rows(rooms)
                target_round = ROOM_TO_ROUND.get(active_r, 1)
            bundle = _in_memory_bundle(team_id, target_round)
            return _build_hint_status_from_bundle(
                target_round,
                bundle["total_penalty"],
                bundle["hints"],
                bundle["fragments"],
                bundle["clues"],
                content=content,
            )

    with conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if room_id and room_id in ROOM_TO_ROUND:
                target_round = ROOM_TO_ROUND[room_id]
            else:
                cur.execute(
                    """SELECT tr.room_id FROM team_rooms tr
                       WHERE tr.team_id = %s
                       ORDER BY tr.id DESC LIMIT 1""",
                    (team_id,),
                )
                last_room = cur.fetchone()
                if last_room and last_room["room_id"] in ROOM_TO_ROUND:
                    target_round = ROOM_TO_ROUND[last_room["room_id"]]
                else:
                    cur.execute("SELECT round FROM rounds WHERE status = 'live' ORDER BY round DESC LIMIT 1")
                    live_r = cur.fetchone()
                    target_round = live_r["round"] if live_r else 1

            bundle = _fetch_hint_bundle(cur, team_id, target_round)
            return _build_hint_status_from_bundle(
                target_round,
                bundle["total_penalty"],
                bundle["hints"],
                bundle["fragments"],
                bundle["clues"],
                content=content,
            )


def _select_next_hint_action(
    room_id: str,
    round_num: int,
    target_id: Optional[str],
    bundle: Dict[str, Any],
    content: Dict[str, Any],
) -> Dict[str, Any]:
    """Pure Python state evaluation to decide whether to re-inspect, raise 403, or unlock Phase 1/2 hint."""
    budget = ROUND_HINT_BUDGET.get(round_num, DEFAULT_ROUND_HINT_BUDGET)
    hints = bundle["hints"]
    hints_by_target = {h["target_id"]: h for h in hints}

    if target_id and target_id in hints_by_target:
        existing = hints_by_target[target_id]
        details = CLUE_HINT_DETAILS.get(target_id) if existing["hint_category"] == "clue" else None
        return {
            "action": "reinspect",
            "target_id": existing["target_id"],
            "hint_category": existing["hint_category"],
            "room_id": existing["room_id"],
            "hint_text": existing["hint_text"],
            "hint_details": details,
        }

    if len(hints) >= budget:
        raise HTTPException(
            403,
            detail={
                "code": "HINT_BUDGET_EXHAUSTED",
                "message": f"Round {round_num} hint budget exhausted ({budget}/{budget} used).",
            },
        )

    collected_fragments = {
        f["fragment_id"] for f in bundle["fragments"] if f.get("room_id") == room_id
    }
    content_room = next((r for r in content.get("rooms", []) if r.get("id") == room_id), None)
    if content_room and content_room.get("evidence"):
        expected_fragments = [ev["id"] for ev in content_room["evidence"] if ev.get("id")]
    else:
        expected_fragments = ROOM_FRAGMENTS.get(room_id, [])

    uncollected_fragments = [fid for fid in expected_fragments if fid not in collected_fragments]

    room_rec = next((r for r in bundle["rooms"] if r.get("room_id") == room_id), None)
    already_marked_unlocked = bool(room_rec and room_rec.get("is_basket_unlocked"))
    all_frags_collected = len(uncollected_fragments) == 0 and len(expected_fragments) > 0
    is_basket_unlocked = already_marked_unlocked or all_frags_collected
    persist_basket = all_frags_collected and not already_marked_unlocked

    # PHASE 1: Hunting Fragments
    if not is_basket_unlocked and uncollected_fragments:
        next_fragment_id = uncollected_fragments[0]
        if next_fragment_id in hints_by_target:
            existing_frag = hints_by_target[next_fragment_id]
            return {
                "action": "reinspect",
                "target_id": next_fragment_id,
                "hint_category": "fragment",
                "room_id": room_id,
                "hint_text": existing_frag["hint_text"],
                "hint_details": None,
            }
        hint_text = _get_fragment_hint_text(content, room_id, next_fragment_id)
        return {
            "action": "unlock",
            "target_id": next_fragment_id,
            "hint_category": "fragment",
            "room_id": room_id,
            "hint_text": hint_text,
            "hint_details": None,
            "penalty": FRAGMENT_PENALTY_SECONDS,
            "persist_basket": False,
            "message": f"Fragment hint unlocked (+{FRAGMENT_PENALTY_SECONDS}s penalty applied).",
        }

    # PHASE 2: Deciphering Clues
    clues_prog = {r["clue_id"]: r for r in bundle["clues"]}
    expected_clues = ROOM_CLUES.get(room_id, [])
    clue_defs = {c.get("id"): c for c in content.get("clues", []) if c.get("id")}

    active_clue_id = None
    for cid in expected_clues:
        prog = clues_prog.get(cid, {"solved": False, "attempts": 0})
        clue_def = clue_defs.get(cid, {})
        max_att = clue_def.get("attempts_max", 3)
        is_resolved = bool(prog.get("solved") or (max_att is not None and prog.get("attempts", 0) >= max_att))
        if not is_resolved:
            active_clue_id = cid
            break

    if not active_clue_id:
        active_clue_id = expected_clues[-1]

    if active_clue_id in hints_by_target:
        existing_clue = hints_by_target[active_clue_id]
        return {
            "action": "reinspect",
            "target_id": active_clue_id,
            "hint_category": "clue",
            "room_id": room_id,
            "hint_text": existing_clue["hint_text"],
            "hint_details": CLUE_HINT_DETAILS.get(active_clue_id),
            "persist_basket": persist_basket,
        }

    clue_details = CLUE_HINT_DETAILS.get(
        active_clue_id,
        {
            "title": active_clue_id,
            "location_prop": f"Interactive prop for clue {active_clue_id} in {room_id}.",
            "puzzle_type": "Cryptographic Puzzle",
            "guidance": "Review the clue scene text and available fragments.",
        },
    )
    rich_hint_text = (
        f"[{clue_details['title']}] Location: {clue_details['location_prop']} | "
        f"Type: {clue_details['puzzle_type']} | Guidance: {clue_details['guidance']}"
    )
    return {
        "action": "unlock",
        "target_id": active_clue_id,
        "hint_category": "clue",
        "room_id": room_id,
        "hint_text": rich_hint_text,
        "hint_details": clue_details,
        "penalty": CLUE_PENALTY_SECONDS,
        "persist_basket": persist_basket,
        "message": f"Clue hint unlocked (+{CLUE_PENALTY_SECONDS}s penalty applied).",
    }


def request_hint(
    team_id: int,
    room_id: Optional[str] = None,
    target_id: Optional[str] = None
) -> Dict[str, Any]:
    """Dispatches a hint according to the two-phase rule with strict budget and time penalties."""
    content = get_content_data()
    valid_rooms = set(ROOM_FRAGMENTS.keys()) | {r.get("id") for r in content.get("rooms", [])}

    conn = get_db_connection()
    if not conn:
        with _MEM_HINT_LOCK:
            if not room_id:
                mem_rooms = [
                    {"room_id": rid, "is_completed": bool(v.get("is_completed"))}
                    for (tid, rid), v in IN_MEMORY_ROOMS.items()
                    if tid == team_id
                ]
                room_id = _resolve_active_room_from_rows(mem_rooms)
            if room_id not in valid_rooms:
                raise HTTPException(400, f"Invalid room_id '{room_id}'")

            round_num = ROOM_TO_ROUND.get(room_id, 1)
            bundle = _in_memory_bundle(team_id, round_num)
            decision = _select_next_hint_action(room_id, round_num, target_id, bundle, content)

            if decision["action"] == "reinspect":
                if decision.get("persist_basket"):
                    IN_MEMORY_ROOMS[(team_id, room_id)] = {
                        **IN_MEMORY_ROOMS.get((team_id, room_id), {"is_completed": False}),
                        "is_basket_unlocked": True,
                    }
                snapshot = _build_hint_status_from_bundle(
                    round_num, bundle["total_penalty"], bundle["hints"], bundle["fragments"], bundle["clues"], content=content
                )
                return {
                    **snapshot,
                    "success": True,
                    "penalty_seconds": 0,
                    "target_id": decision["target_id"],
                    "hint_category": decision["hint_category"],
                    "room_id": decision["room_id"],
                    "hint_text": decision["hint_text"],
                    "hint_details": decision["hint_details"],
                    "penalty_applied": 0,
                    "is_free": True,
                    "message": "Re-inspected previously unlocked hint (no penalty applied).",
                }

            penalty = decision["penalty"]
            new_row = {
                "id": len(IN_MEMORY_HINTS) + 1,
                "team_id": team_id,
                "round": round_num,
                "room_id": room_id,
                "hint_category": decision["hint_category"],
                "target_id": decision["target_id"],
                "penalty_seconds": penalty,
                "hint_text": decision["hint_text"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            IN_MEMORY_HINTS.append(new_row)
            IN_MEMORY_ROUND_PENALTIES[(team_id, round_num)] = (
                IN_MEMORY_ROUND_PENALTIES.get((team_id, round_num), 0) + penalty
            )
            if decision.get("persist_basket"):
                IN_MEMORY_ROOMS[(team_id, room_id)] = {
                    **IN_MEMORY_ROOMS.get((team_id, room_id), {"is_completed": False}),
                    "is_basket_unlocked": True,
                }
            bundle["hints"].append(new_row)
            bundle["total_penalty"] = IN_MEMORY_ROUND_PENALTIES[(team_id, round_num)]
            snapshot = _build_hint_status_from_bundle(
                round_num, bundle["total_penalty"], bundle["hints"], bundle["fragments"], bundle["clues"], content=content
            )
            return {
                **snapshot,
                "success": True,
                "penalty_seconds": penalty,
                "target_id": decision["target_id"],
                "hint_category": decision["hint_category"],
                "room_id": room_id,
                "hint_text": decision["hint_text"],
                "hint_details": decision["hint_details"],
                "penalty_applied": penalty,
                "is_free": False,
                "message": decision["message"],
            }

    with conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if not room_id:
                cur.execute(
                    "SELECT room_id, is_completed FROM team_rooms WHERE team_id = %s ORDER BY id DESC",
                    (team_id,),
                )
                room_id = _resolve_active_room_from_rows(cur.fetchall())

            if room_id not in valid_rooms:
                raise HTTPException(400, f"Invalid room_id '{room_id}'")

            round_num = ROOM_TO_ROUND.get(room_id, 1)
            bundle = _fetch_hint_bundle(cur, team_id, round_num)
            decision = _select_next_hint_action(room_id, round_num, target_id, bundle, content)

            if decision["action"] == "reinspect":
                if decision.get("persist_basket"):
                    cur.execute(
                        """INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                           VALUES (%s, %s, TRUE)
                           ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE""",
                        (team_id, room_id),
                    )
                    conn.commit()
                snapshot = _build_hint_status_from_bundle(
                    round_num,
                    bundle["total_penalty"],
                    bundle["hints"],
                    bundle["fragments"],
                    bundle["clues"],
                    content=content,
                )
                return {
                    **snapshot,
                    "success": True,
                    "penalty_seconds": 0,
                    "target_id": decision["target_id"],
                    "hint_category": decision["hint_category"],
                    "room_id": decision["room_id"],
                    "hint_text": decision["hint_text"],
                    "hint_details": decision["hint_details"],
                    "penalty_applied": 0,
                    "is_free": True,
                    "message": "Re-inspected previously unlocked hint (no penalty applied).",
                }

            penalty = decision["penalty"]
            write_res = _atomic_insert_hint(
                conn,
                cur,
                team_id=team_id,
                round_num=round_num,
                room_id=room_id,
                hint_category=decision["hint_category"],
                target_id=decision["target_id"],
                penalty=penalty,
                hint_text=decision["hint_text"],
                persist_basket=bool(decision.get("persist_basket")),
            )
            conn.commit()

            inserted_hint = write_res.get("inserted_hint")
            if inserted_hint is not None:
                bundle["hints"].append(inserted_hint)
                if write_res.get("new_total_penalty") is not None:
                    bundle["total_penalty"] = write_res["new_total_penalty"]
                else:
                    bundle["total_penalty"] = (bundle["total_penalty"] or 0) + penalty
                is_free_now = False
                applied_penalty = penalty
                msg_now = decision["message"]
            else:
                # Lost concurrent race: re-fetch once so response mirrors teammate's committed state
                bundle = _fetch_hint_bundle(cur, team_id, round_num)
                is_free_now = True
                applied_penalty = 0
                msg_now = "Teammate already unlocked this hint (no extra penalty)."

            snapshot = _build_hint_status_from_bundle(
                round_num,
                bundle["total_penalty"],
                bundle["hints"],
                bundle["fragments"],
                bundle["clues"],
                content=content,
            )
            return {
                **snapshot,
                "success": True,
                "penalty_seconds": applied_penalty,
                "target_id": decision["target_id"],
                "hint_category": decision["hint_category"],
                "room_id": room_id,
                "hint_text": decision["hint_text"],
                "hint_details": decision["hint_details"],
                "penalty_applied": applied_penalty,
                "is_free": is_free_now,
                "message": msg_now,
            }
