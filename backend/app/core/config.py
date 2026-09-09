from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "crimenet2026"
    SECRET_KEY: str = "crimenet-x-secret-key-2026"
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    EVIDENCE_HASH_REVEAL_SECRET: str = "CRIMENET_EVID_AUTH_CLEARANCE_KEY_2026"

    class Config:
        env_file = ".env"

settings = Settings()
