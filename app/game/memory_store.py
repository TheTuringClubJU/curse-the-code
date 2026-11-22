from typing import Any, Dict, List

# Shared in-memory stores for local development / fallback when PostgreSQL is unavailable.
IN_MEMORY_FRAGMENTS: List[Dict[str, Any]] = []
IN_MEMORY_ROOMS: Dict[tuple, Dict[str, Any]] = {}
IN_MEMORY_CLUES: Dict[tuple, Dict[str, Any]] = {}
IN_MEMORY_HINTS: List[Dict[str, Any]] = []
IN_MEMORY_ROUND_PENALTIES: Dict[tuple, int] = {}
