"""
Curse the Code - Room 6: The Anointing Vault (vault) Backend Service
Lead Backend: Hari Priya (@Haripriya24071)

Encapsulates all cryptographic verification, compound candidate parsing,
prerequisite terminal interlocks, atmospheric messaging, and Grand Finale
victory state recording for Room 6 (R2-08, R2-09, R2-10).
"""

import hmac
import hashlib
from typing import Dict, Any, Optional, List


def check_vault_prerequisite(clue_id: str, target_clue: Dict[str, Any], team_id: int, content: Dict[str, Any], cur) -> Optional[Dict[str, Any]]:
    """
    Enforces prerequisite terminal interlocks for Room 6 Grand Finale (R2-10).
    R2-10 requires both R2-08 and R2-09 to be resolved (either solved or attempts exhausted).
    """
    if clue_id != "R2-10":
        return None

    requires_resolved = target_clue.get("unlock", {}).get("requires_resolved", [])
    if not requires_resolved:
        return None

    cur.execute(
        """
        SELECT clue_id, solved, attempts
        FROM team_clues
        WHERE team_id = %s AND clue_id = ANY(%s)
        """,
        (team_id, requires_resolved)
    )
    prereqs_map = {r["clue_id"]: r for r in cur.fetchall()}

    for req_id in requires_resolved:
        r_info = prereqs_map.get(req_id, {})
        req_clue = next((cl for cl in content.get("clues", []) if cl["id"] == req_id), {})
        req_max = req_clue.get("attempts_max", 3)
        req_resolved = bool(r_info.get("solved") or (req_max is not None and r_info.get("attempts", 0) >= req_max))
        if not req_resolved:
            return {
                "ok": True,
                "correct": False,
                "locked": True,
                "message": f"Final terminal locked. Solve prerequisite room clues ({', '.join(requires_resolved)}) first."
            }

    return None


def extract_compound_candidate(payload: Dict[str, Any], answer: Any) -> Optional[str]:
    """
    Parses compound multi-field inputs for R2-10 (Clean Steps + Auth Code + Operator Badge).
    Robustly handles dictionaries (snake_case and camelCase keys), lists, or delimited strings.
    Returns normalized pipe-delimited candidate: '{clean_steps}|{auth_code}|{operator_badge}'.
    """
    raw = answer if answer is not None else payload
    steps, code, badge = None, None, None

    if isinstance(raw, dict):
        steps = (
            raw.get("steps") or raw.get("clean_steps") or raw.get("cleanSteps") or
            raw.get("clean_protocol_steps") or raw.get("protocol_steps") or raw.get("protocolSteps")
        )
        code = (
            raw.get("code") or raw.get("auth_code") or raw.get("authCode") or
            raw.get("authorization_code") or raw.get("authorizationCode") or
            raw.get("circuit_code") or raw.get("circuitCode") or raw.get("pin")
        )
        badge = (
            raw.get("badge") or raw.get("badge_id") or raw.get("badgeId") or
            raw.get("operator_badge") or raw.get("operatorBadge") or
            raw.get("sender_badge") or raw.get("senderBadge") or raw.get("real_sender_badge")
        )

        if not (steps and code and badge):
            vals = [str(v) for k, v in raw.items() if k != "answer" and v is not None and str(v).strip()]
            if len(vals) >= 3:
                steps, code, badge = vals[0], vals[1], vals[2]
            elif "answer" in raw:
                return extract_compound_candidate(payload, raw["answer"])

    elif isinstance(raw, list):
        if len(raw) >= 3:
            steps, code, badge = raw[0], raw[1], raw[2]

    elif isinstance(raw, str):
        if "|" in raw:
            parts = [p.strip() for p in raw.split("|") if p.strip()]
        elif ";" in raw:
            parts = [p.strip() for p in raw.split(";") if p.strip()]
        elif "," in raw and raw.count(",") == 2:
            parts = [p.strip() for p in raw.split(",") if p.strip()]
        else:
            parts = [p.strip() for p in raw.replace(",", " ").split() if p.strip()]

        if len(parts) >= 3:
            steps, code, badge = parts[0], parts[1], parts[2]

    if steps is not None and code is not None and badge is not None:
        s_norm = "".join(ch for ch in str(steps) if ch.isdigit())
        c_norm = "".join(ch for ch in str(code) if ch.isdigit())
        b_norm = "".join(ch for ch in str(badge).upper() if ch.isalnum())
        return f"{s_norm}|{c_norm}|{b_norm}"

    return None


def validate_vault_clue_match(
    clue_id: str,
    stage_def: Dict[str, Any],
    candidates: List[str],
    compound_cand: Optional[str],
    answer_salt: str
) -> bool:
    """
    Validates clue submissions for Room 6 clues (R2-08, R2-09, R2-10).
    Enforces atomic compound matching for R2-10 (single fields are strictly rejected).
    """
    stage_idx = stage_def.get("index", 1)
    expected_hash = stage_def.get("answer_hash")
    answer_plain_list = stage_def.get("answer_plain", [])
    field_norm = stage_def.get("fields", [{}])[0].get("normalize", "alnum")

    if clue_id == "R2-10":
        # R2-10 Grand Finale requires simultaneous atomic compound match
        if not compound_cand:
            return False

        # Build compound candidate variants (normalized alnum badge vs hyphen-preserved badge)
        compound_variants = [compound_cand]
        if "|" in compound_cand:
            parts = compound_cand.split("|")
            if len(parts) == 3:
                s, c, b = parts[0], parts[1], parts[2]
                if not b.startswith("BDG-") and b.startswith("BDG"):
                    compound_variants.append(f"{s}|{c}|BDG-{b[3:]}")
                elif b.startswith("BDG-"):
                    compound_variants.append(f"{s}|{c}|BDG{b[4:]}")

        for variant in compound_variants:
            msg = f"{clue_id}:{stage_idx}:{variant}".encode("utf-8")
            calc_hash = hmac.new(answer_salt.encode("utf-8"), msg, hashlib.sha256).hexdigest()
            if expected_hash and hmac.compare_digest(calc_hash, expected_hash):
                return True

        # Plain list comparison (in test mode)
        if len(answer_plain_list) >= 3:
            norm_plains = ["".join(ch for ch in str(p).upper() if ch.isalnum() or ch.isdigit()) for p in answer_plain_list]
            expected_compound = "|".join(norm_plains)
            raw_compound = "|".join([str(p).strip().upper() for p in answer_plain_list])
            if any(v in (expected_compound, raw_compound) for v in compound_variants):
                return True

        return False

    # Standard Room 6 verification for R2-08 and R2-09
    for cand in candidates:
        if "|" in cand:
            norm_c = cand
        elif field_norm == "digits":
            norm_c = "".join(ch for ch in cand if ch.isdigit())
        elif field_norm == "alnum":
            norm_c = "".join(ch for ch in cand.upper() if ch.isalnum())
        else:
            norm_c = cand.upper()

        msg = f"{clue_id}:{stage_idx}:{norm_c}".encode("utf-8")
        calc_hash = hmac.new(answer_salt.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        msg_raw = f"{clue_id}:{stage_idx}:{cand.strip().upper()}".encode("utf-8")
        calc_hash_raw = hmac.new(answer_salt.encode("utf-8"), msg_raw, hashlib.sha256).hexdigest()

        if expected_hash and (hmac.compare_digest(calc_hash, expected_hash) or hmac.compare_digest(calc_hash_raw, expected_hash)):
            return True

        for p in answer_plain_list:
            p_str = str(p).strip().upper()
            norm_p = "".join(ch for ch in p_str if ch.isalnum() or ch.isdigit())
            if cand.strip().upper() == p_str or (norm_c and norm_c == norm_p):
                return True

    return False


def record_vault_victory(cur, team_id: int, round_num: int, pts_awarded: float):
    """
    Records tournament qualification and timestamps when R2-10 Grand Finale is solved.
    Sets qualified_at, finished_at, and last_solved_at on team_rounds.
    """
    cur.execute(
        """
        INSERT INTO rounds (round, status)
        VALUES (%s, 'live')
        ON CONFLICT (round) DO UPDATE SET status = 'live';

        INSERT INTO team_rounds (team_id, round, total_score, clues_solved, qualified_at, finished_at, last_solved_at, updated_at)
        VALUES (%s, %s, %s, 1, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT (team_id, round)
        DO UPDATE SET
            total_score = team_rounds.total_score + EXCLUDED.total_score,
            clues_solved = team_rounds.clues_solved + 1,
            qualified_at = COALESCE(team_rounds.qualified_at, NOW()),
            finished_at = COALESCE(team_rounds.finished_at, NOW()),
            last_solved_at = NOW(),
            updated_at = NOW();
        """,
        (round_num, team_id, round_num, pts_awarded)
    )


def get_vault_atmospheric_message(clue_id: str, is_correct: bool) -> Optional[str]:
    """
    Returns horror-themed narrative responses for Room 6 terminals.
    """
    if is_correct:
        if clue_id == "R2-08":
            return "Correct! Tampered procedure steps identified."
        if clue_id == "R2-09":
            return "Correct! Failsafe authorization code verified."
        if clue_id == "R2-10":
            return "Containment protocol restored. Biological core stabilized. Tournament Round 2 Complete!"
    else:
        if clue_id == "R2-08":
            return "Incorrect tampered steps. Check the original manual against Corvin's revision."
        if clue_id == "R2-09":
            return "Incorrect authorization code. Derive the binary inputs from the spectrogram code."
        if clue_id == "R2-10":
            return "CONTAINMENT REJECTED — RESEQUENCE REQUIRED. Check clean steps, authorization code, and operator badge."
    return None


def format_vault_submit_response(clue_id: str, is_correct: bool, resp_data: Dict[str, Any]):
    """
    Augments the submission response with Room 6 specific payloads:
    - R2-08: Clean steps reveal payload for downstream solve and dossier display.
    - R2-10: Round completion and tournament qualification flags.
    """
    if is_correct and clue_id == "R2-10":
        resp_data["round_complete"] = True
        resp_data["round_completed"] = True
        resp_data["qualified"] = True

    if is_correct and clue_id == "R2-08":
        resp_data["reveal"] = {
            "clean_steps_text": "TEST: the original manual is intact.",
            "clean_steps": ["1", "3", "4", "5", "7", "8"],
            "clean_steps_code": "134578"
        }


def format_vault_dossier_reveal(cid: str, is_solved: bool, reveal: Optional[Dict[str, Any]]):
    """
    Augments the Case Dossier ([C] key) for R2-08 with clean steps metadata.
    """
    if cid == "R2-08" and is_solved and reveal is not None:
        reveal["clean_steps"] = ["1", "3", "4", "5", "7", "8"]
        reveal["clean_steps_code"] = "134578"

