-- ============================================================================
-- RESET SCRIPT FOR ROUND 2, ROOM 5 (THE SURVEILLANCE MORGUE / CONTROL BAY)
-- Resets all Room 5 evidence fragments, basket state, clue progress, and exit forks.
-- ============================================================================

-- 1. Remove all collected fragments for Room 5
DELETE FROM team_fragments 
WHERE room_id = 'control';

-- 2. Reset Room 5 basket lock & completion status
UPDATE team_rooms 
SET is_basket_unlocked = FALSE, 
    is_completed = FALSE, 
    completed_at = NULL 
WHERE room_id = 'control';

-- 3. Reset all Room 5 clue terminals (R2-01, R2-05, R2-06)
DELETE FROM team_clues 
WHERE room_id = 'control';

-- 4. Clear answer submissions for Room 5 clues
DELETE FROM submissions 
WHERE clue_id IN ('R2-01', 'R2-05', 'R2-06');

-- 5. Clear hint usage for Room 5
DELETE FROM team_hints 
WHERE round = 2 OR room_id = 'control';

-- 6. Reset Fork 2 (Vault Exit Door selection), keeping Fork 1 intact (entrance to Room 5)
DELETE FROM team_forks 
WHERE round = 2 AND fork_id = 'fork_2';

