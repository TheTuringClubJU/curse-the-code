"""Room 2 hint policy. Team-row locking protects costs and unique dispatches."""
from fastapi import HTTPException
from app.game.study_service import _transaction, _room, _require_access, _fragments, _next_fragment
from app.game.hint_service import TOTAL_HINT_BUDGET, FRAGMENT_PENALTY_SECONDS, CLUE_PENALTY_SECONDS


def request_study_hint(team_id, content, target_id=None):
    room = _room(content)
    with _transaction(team_id) as cur:
        _require_access(cur, team_id, room)
        cur.execute("SELECT * FROM team_hints WHERE team_id = %s AND round = 1 ORDER BY created_at, id", (team_id,))
        hints = cur.fetchall()
        cur.execute("SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = 1", (team_id,))
        row = cur.fetchone()
        total_penalty = (row and row['penalty_seconds']) or 0
        collected = {f['fragment_id'] for f in _fragments(cur, team_id)}
        if target_id:
            old = next((h for h in hints if h['room_id'] == 'study' and h['target_id'] == target_id), None)
            if old:
                return {'success': True, 'target_id': target_id, 'room_id': 'study',
                        'hint_category': old['hint_category'], 'hint_text': old['hint_text'],
                        'is_free': True, 'penalty_applied': 0, 'penalty_seconds': 0,
                        'hints_used': len(hints), 'hints_remaining': max(0, TOTAL_HINT_BUDGET-len(hints)),
                        'total_penalty_seconds': total_penalty}
        remaining = [ev for ev in room.get('evidence', []) if ev['id'] not in collected]
        category, details, target = 'fragment', None, None
        fragment = _next_fragment(content, room, collected) if remaining else None
        if fragment:
            target = fragment['id']
            locations = {
                'bookshelf': 'Look between the reference books along the west archive wall. Revisit a different row if you searched here before.',
                'corkboard': 'Examine the overlapping papers and lower edge of the corkboard on the east wall, beside the recorder.',
                'desk_blotter': 'Check beneath the leather writing mat on the main desk.',
                'filing_cabinet': 'Search the carved archive cabinet beside the west wall console. Return to its lower storage for a later lead.',
                'sticky_wall': 'Check the three small notes beside the map above the west wall console.',
                'armchair': 'Search between the cushions of the chair behind the main desk.',
                'reel_recorder': 'Inspect the reel recorder on the southeast side table, including its controls and compartments.',
                'cable_bundle': 'Examine the cable bundle on the floor beside the main desk.',
                'floor_lamp': 'Search the base of the oil lamp on the Victorian console beneath the wall map.',
                'wastebin': 'Check the waste bin beside the desk chair.',
                'window': 'Inspect the sill beneath the east gothic window.',
                'radiator': 'Look behind the cast-iron radiator beneath the east window.',
            }
            object_id = fragment.get('hiding', {}).get('object_id', '')
            hint_text = locations.get(object_id) or fragment.get('locate_hint') or 'Examine the current search object carefully.'
        elif remaining:
            return {'success': True, 'is_free': True, 'penalty_applied': 0,
                    'hint_text': 'Return to the Bedroom for any missing earlier records, then revisit the Study.'}
        else:
            category = 'clue'
            cur.execute("SELECT clue_id, solved, attempts FROM team_clues WHERE team_id = %s AND round = 1", (team_id,))
            progress = {c['clue_id']: c for c in cur.fetchall()}
            for clue in sorted((c for c in content.get('clues', []) if c.get('room') == 'study'), key=lambda c: c['id']):
                saved = progress.get(clue['id'], {})
                max_attempts = clue.get('attempts_max', 3)
                if saved.get('solved') or (max_attempts is not None and saved.get('attempts', 0) >= max_attempts):
                    continue
                target = clue['id']
                # Use the actual content's first subtle hint, never a guessed answer or cipher.
                clue_hints = sorted(clue.get('hints', []), key=lambda h: (h.get('stage', 1), h.get('level', 1)))
                hint_text = clue_hints[0]['text'] if clue_hints else 'Compare the recovered records in this case file. Their order matters.'
                details = {'location_prop': {'tablet_drawer': 'Drawer of the Victorian console beneath the wall map.',
                    'crt_monitor': 'Screen of the computer on the main desk.',
                    'terminal_pc': 'Base and keyboard of the same computer on the main desk.',
                    'line_printer': 'Vintage printer on the main desk.'}.get(clue.get('object_id'), 'Study case file'),
                    'guidance': hint_text, 'title': clue.get('title', target)}
                break
            if target is None:
                return {'success': True, 'is_free': True, 'penalty_applied': 0,
                        'hint_text': 'The case files are resolved. Head to the north Basement door and press E.'}
        existing = next((h for h in hints if h['room_id'] == 'study' and h['target_id'] == (target_id or target)), None)
        if target_id and not existing and target_id != target:
            raise HTTPException(400, 'Only the current lead or an already unlocked Study hint can be requested.')
        if existing:
            return {'success': True, 'target_id': existing['target_id'], 'room_id': 'study',
                    'hint_category': existing['hint_category'], 'hint_text': existing['hint_text'],
                    'hint_details': details if existing['target_id'] == target else None,
                    'is_free': True, 'penalty_applied': 0, 'penalty_seconds': 0,
                    'hints_used': len(hints), 'hints_remaining': max(0, TOTAL_HINT_BUDGET-len(hints)),
                    'total_penalty_seconds': total_penalty}
        if len(hints) >= TOTAL_HINT_BUDGET:
            raise HTTPException(403, detail={'code': 'HINT_BUDGET_EXHAUSTED', 'message': 'Tournament hint budget exhausted (15/15 used).'})
        study_count = sum(h['room_id'] == 'study' for h in hints)
        penalty = 0 if study_count < 2 else (FRAGMENT_PENALTY_SECONDS if category == 'fragment' else CLUE_PENALTY_SECONDS)
        cur.execute('''INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                       VALUES (%s, 1, 'study', %s, %s, %s, %s)''', (team_id, category, target, penalty, hint_text))
        cur.execute('''INSERT INTO team_rounds (team_id, round, penalty_seconds, updated_at) VALUES (%s, 1, %s, NOW())
                       ON CONFLICT (team_id, round) DO UPDATE SET penalty_seconds = team_rounds.penalty_seconds + EXCLUDED.penalty_seconds,
                       updated_at = NOW() RETURNING penalty_seconds''', (team_id, penalty))
        total_penalty = cur.fetchone()['penalty_seconds']
        return {'success': True, 'target_id': target, 'target_title': (details or {}).get('title', target),
                'room_id': 'study', 'hint_category': category, 'hint_text': hint_text, 'hint_details': details,
                'is_free': penalty == 0, 'penalty_applied': penalty, 'penalty_seconds': penalty,
                'point_deduction_on_solve': 15 if category == 'clue' and penalty else 0,
                'hints_used': len(hints)+1, 'hints_remaining': TOTAL_HINT_BUDGET-len(hints)-1,
                'total_penalty_seconds': total_penalty}
