import os
import json
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

CONTENT_FILE = os.getenv("CONTENT_FILE", "content.test.json")
MAX_SESSIONS_PER_TEAM = 2

def load_rules() -> Dict[str, Any]:
    global MAX_SESSIONS_PER_TEAM
    if os.path.exists(CONTENT_FILE):
        try:
            with open(CONTENT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                meta = data.get("meta", {})
                rules = meta.get("rules", {})
                MAX_SESSIONS_PER_TEAM = rules.get("max_sessions_per_team", 2)
                return rules
        except Exception:
            pass
    return {"max_sessions_per_team": 2}

load_rules()
