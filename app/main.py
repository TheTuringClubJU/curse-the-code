import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.login.routes import login_router
from app.lobby.routes import lobby_router
from app.admin.routes import admin_router
from app.game.routes import router as game_router
from app.db import ensure_schema_updates

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema_updates()
    yield

app = FastAPI(
    title="Curse the Code - API",
    description="Backend API for Curse the Code event with user authentication",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for frontend development and production (e.g. Vercel)
cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
for d in default_origins:
    if d not in allowed_origins:
        allowed_origins.append(d)

cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")
cors_kwargs = {
    "allow_origins": allowed_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if cors_origin_regex:
    cors_kwargs["allow_origin_regex"] = cors_origin_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Register login auth and lobby routes
app.include_router(login_router)
app.include_router(lobby_router)
app.include_router(admin_router)
app.include_router(game_router)


from datetime import datetime, timezone

@app.get("/api/time")
def get_server_time():
    now = datetime.now(timezone.utc)
    remaining = 900
    ends_at = now.timestamp() + remaining
    return {
        "remaining_seconds": remaining,
        "remaining": remaining,
        "server_time": now.isoformat(),
        "now": now.isoformat(),
        "ends_at": datetime.fromtimestamp(ends_at, tz=timezone.utc).isoformat()
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "pack_label": "curse-the-code-2026",
        "service": "user-login"
    }

# Mount frontend build if directory exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
