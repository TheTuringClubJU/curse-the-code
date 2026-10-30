from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    team_name: str = Field(..., min_length=2, max_length=40)
    password: str = Field(..., min_length=1, max_length=100)

class LogoutAllRequest(BaseModel):
    team_name: str = Field(..., min_length=2, max_length=40)
    password: str = Field(..., min_length=1, max_length=100)

class ActiveSessionInfo(BaseModel):
    device_label: Optional[str] = "Unknown Device"
    last_seen_at: Optional[datetime] = None

class LoginSuccessResponse(BaseModel):
    ok: bool = True
    team: dict
    active_sessions: int
    message: str

class LogoutResponse(BaseModel):
    ok: bool = True
    sessions_ended: int
    message: str

class AuthErrorResponse(BaseModel):
    code: str
    message: str
    retry_after_sec: Optional[int] = None
    active_sessions: Optional[int] = None
    devices: Optional[List[str]] = None
