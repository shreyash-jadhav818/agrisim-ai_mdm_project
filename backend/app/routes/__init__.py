from .crops import router as crops_router
from .simulation import router as simulation_router
from .optimization import router as optimization_router
from .stress_test import router as stress_test_router
from .risk import router as risk_router
from .ai import router as ai_router
from .history import router as history_router
from .reports import router as reports_router

__all__ = [
    "crops_router",
    "simulation_router",
    "optimization_router",
    "stress_test_router",
    "risk_router",
    "ai_router",
    "history_router",
    "reports_router",
]
