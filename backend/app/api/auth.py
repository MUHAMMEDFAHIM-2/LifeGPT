from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.auth import check_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    if not check_password(payload.password):
        raise HTTPException(status_code=401, detail="Wrong password")
    return LoginResponse(token=create_token())
