from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class LoginData(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(data: LoginData):
    # Dummy auth
    if data.username == "admin" and data.password == "admin":
        return {"access_token": "fake-jwt-token-12345", "token_type": "bearer"}
    return {"error": "Invalid credentials"}
