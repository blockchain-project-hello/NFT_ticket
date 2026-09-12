import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ChatRequest, ChatResponse
from app.services.supabase_client import get_organizer_events, get_analytics_for_organizer
from app.services.rag_engine import RAGEngine

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize RAGEngine instance
rag_engine = RAGEngine()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint for organizer AI assistant chat using RAG.
    """
    try:
        events = get_organizer_events(request.organizer_wallet)
        if not events:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Wallet is not a recognized organizer")
            
        analytics = get_analytics_for_organizer(request.organizer_wallet)
        
        reply = rag_engine.query(
            organizer_wallet=request.organizer_wallet,
            message=request.message,
            analytics=analytics
        )
        
        return ChatResponse(
            reply=reply,
            context_used=["Organizer analytics context", "Vector DB search results"]
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate response")
