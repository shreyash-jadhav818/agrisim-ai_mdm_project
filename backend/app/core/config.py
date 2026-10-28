import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriSim AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # SQLite Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agrisim.db")
    
    # Optional Ollama Local LLM Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    
    # Optional External AI Providers (OpenAI / Gemini)
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    
    # CORS Origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
