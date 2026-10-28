"""
AgriSim AI - Pydantic Schemas for AI Advisor, Explainability, and Conversational Assistant
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.simulation import SimulationResult

class AIExplanationRequest(BaseModel):
    simulation_result: SimulationResult
    comparison_results: Optional[List[Dict[str, Any]]] = None
    farmer_query: Optional[str] = Field(
        default=None,
        description="Optional specific question asked by farmer"
    )

class AIExplanationResponse(BaseModel):
    executive_summary: str
    limiting_factor_analysis: str
    irrigation_diagnosis: str
    fertilizer_diagnosis: str
    profit_levers: str
    actionable_recommendations: List[str]
    scientific_basis: str
    engine_used: str  # "Ollama (llama3.2)", "External AI", or "AgriSim Expert Rule-Engine"

class ExplainableRecommendation(BaseModel):
    recommendation: str = Field(..., description="Actionable strategy headline and operational parameters")
    reasoning: str = Field(..., description="Biophysical and economic simulation evidence supporting the recommendation")
    expected_impact: Dict[str, Any] = Field(..., description="Calculated absolute deltas and percentage changes")
    trade_offs: str = Field(..., description="Explicit disclosure of what the farmer concedes or risks")
    assumptions: List[str] = Field(..., description="Scientific model assumptions (FAO-56, Mitscherlich-Baule, etc.)")
    uncertainty_and_limitations: List[str] = Field(..., description="Missing in-situ measurements and boundary limitations")
    practical_next_steps: List[str] = Field(..., description="Actionable verification checklist before field implementation")
    disclaimer: str = Field(
        default="AgriSim AI generates mathematical estimates based on validated biophysical models. Real-world crop outcomes depend on localized weather, microclimates, and management practices.",
        description="Standard scientific decision-support disclaimer"
    )

class AdvisorExplanationRequest(BaseModel):
    baseline_simulation: Optional[SimulationResult] = None
    baseline_payload: Optional[Dict[str, Any]] = None
    recommended_strategy: Optional[Dict[str, Any]] = None
    selected_objective: Optional[str] = "balanced"
    what_if_results: Optional[List[Dict[str, Any]]] = None
    optimization_result: Optional[Dict[str, Any]] = None
    stress_test_result: Optional[Dict[str, Any]] = None
    risk_result: Optional[Dict[str, Any]] = None
    farmer_query: Optional[str] = None

class AdvisorExplanationResponse(BaseModel):
    recommendation_card: ExplainableRecommendation
    narrative_explanation: str
    active_provider: str       # "Local AI (Ollama)", "External AI (OpenAI)", or "Rule-Based Deterministic Engine"
    provider_mode: str         # "local_ollama", "external_ai", or "rule_based"
    confidence_notes: str

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's question or message")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation turns")
    context: Dict[str, Any] = Field(default_factory=dict, description="Active farm simulation context")

class ChatResponse(BaseModel):
    reply: str
    suggested_followups: List[str]
    active_provider: str
    provider_mode: str
    referenced_metrics: Dict[str, Any] = Field(default_factory=dict)

class AIProviderStatus(BaseModel):
    active_provider: str
    provider_mode: str
    local_ollama_available: bool
    ollama_url: str
    ollama_model: str
    external_ai_available: bool
    external_provider: Optional[str] = None
    setup_instructions: str
