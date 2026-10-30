from pydantic import BaseModel, Field

class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)

class RoundControlRequest(BaseModel):
    action: str = Field(..., pattern="^(start_r1|end_r1|reset_r1|start_r2|end_r2|reset_r2)$")

class QualifyTeamsRequest(BaseModel):
    count: int = Field(..., ge=1, le=100)
