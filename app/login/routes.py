import os
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from typing import Optional
from app.login.schemas import LoginRequest, LogoutAllRequest, LoginSuccessResponse, LogoutResponse
from app.login.service import LoginService

login_router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    # If using FastAPI TestClient ("testclient"), fallback to valid inet format
    if ip == "testclient" or not ip:
        return "127.0.0.1"
    return ip

@login_router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "Unknown Browser")
    
    result = LoginService.authenticate_team(
        team_name=req.team_name,
        password=req.password,
        ip=ip,
        user_agent=ua
    )
    
    if "error" in result:
        err_code = result["error"]
        status_code = 400
        if err_code == "BAD_CREDENTIALS":
            status_code = 401
        elif err_code == "ACCOUNT_DISABLED":
            status_code = 403
        elif err_code in ("LOCKED", "SESSION_LIMIT"):
            status_code = 429 if err_code == "LOCKED" else 409
            
        raise HTTPException(
            status_code=status_code,
            detail={
                "code": err_code,
                "message": result["message"],
                "retry_after_sec": result.get("retry_after_sec"),
                "active_sessions": result.get("active_sessions"),
                "devices": result.get("devices")
            }
        )

    # Set secure HTTP-only cookie
    raw_token = result["token"]
    response.set_cookie(
        key="team_session",
        value=raw_token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=12 * 3600
    )

    return {
        "ok": True,
        "team": result["team"],
        "active_sessions": result["active_sessions"],
        "message": f"Welcome, {result['team']['name']}! Authenticated successfully."
    }

@login_router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("team_session")
    if token:
        LoginService.logout_single_session(token)
    response.delete_cookie(
        key="team_session",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE
    )
    return {"ok": True, "message": "Signed out successfully."}

@login_router.post("/logout-all")
async def logout_all(req: LogoutAllRequest, request: Request, response: Response):
    ip = get_client_ip(request)
    res = LoginService.logout_all_sessions(req.team_name, req.password, ip)
    
    if "error" in res:
        raise HTTPException(
            status_code=401,
            detail={
                "code": res["error"],
                "message": res["message"]
            }
        )
    
    # Also clear cookie if this browser had that team's session
    response.delete_cookie(
        key="team_session",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE
    )
    return res

@login_router.get("/me")
async def get_me(request: Request):
    token = request.cookies.get("team_session")
    data = LoginService.get_current_team_by_token(token) if token else None
    
    if not data:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHENTICATED", "message": "Not authenticated."}
        )

    return {
        "ok": True,
        "team": {
            "id": data["team"]["id"],
            "name": data["team"]["name"],
            "members": data["team"].get("members", [])
        },
        "session_id": data["session"]["id"],
        "device_label": data["session"]["device_label"],
        "active_sessions": data["active_sessions"]
    }
