from fastapi import APIRouter, HTTPException
from app.schemas.ai import (
    AIExplanationRequest,
    AIExplanationResponse,
    AdvisorExplanationRequest,
    AdvisorExplanationResponse,
    ChatRequest,
    ChatResponse,
    AIProviderStatus
)
from app.simulation.explainer import get_ai_simulation_explanation
from app.simulation.ai_advisor import (
    check_ai_provider_status,
    explain_farm_decisions,
    conversational_farm_assistant
)

router = APIRouter(prefix="/ai", tags=["Explainable AI & Agricultural Advisor"])

@router.get("/provider-status", response_model=AIProviderStatus)
def get_provider_status():
    """
    Returns the active AI provider status (Local Ollama, External AI, or Rule-Based Engine)
    along with configuration diagnostics and setup instructions.
    """
    try:
        return check_ai_provider_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check AI provider: {str(e)}")

@router.post("/explain", response_model=AIExplanationResponse)
def explain_simulation(request: AIExplanationRequest):
    """
    Produces transparent agronomic explanations of simulation findings, identifying
    limiting factors, yield gap drivers, and actionable recommendations.
    Uses Ollama if running locally; otherwise falls back gracefully to the rule engine.
    """
    try:
        return get_ai_simulation_explanation(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI explanation failed: {str(e)}")

@router.post("/advisor-explain", response_model=AdvisorExplanationResponse)
def get_advisor_explanation(request: AdvisorExplanationRequest):
    """
    Generates a 7-section explainable agricultural recommendation:
      1. Recommendation
      2. Reasoning
      3. Expected Impact (calculated deltas & percentage changes)
      4. Trade-offs
      5. Assumptions
      6. Uncertainty & Limitations
      7. Practical Next Steps
    Grounded strictly in biophysical simulation calculations.
    """
    try:
        return explain_farm_decisions(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advisor explanation failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
def chat_with_farm_advisor(request: ChatRequest):
    """
    Conversational agricultural assistant that answers farmer questions
    about their current simulation context without hallucinating unmeasured data.
    """
    try:
        return conversational_farm_assistant(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat assistant failed: {str(e)}")
