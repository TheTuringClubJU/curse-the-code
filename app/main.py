import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.login.routes import login_router
from app.lobby.routes import lobby_router
from app.admin.routes import admin_router

app = FastAPI(
    title="Curse the Code - API",
    description="Backend API for Curse the Code event with user authentication",
    version="1.0.0"
)

# CORS setup for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register login auth and lobby routes
app.include_router(login_router)
app.include_router(lobby_router)
app.include_router(admin_router)

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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
