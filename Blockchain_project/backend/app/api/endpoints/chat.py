from fastapi import APIRouter

router = APIRouter()

@router.post("/")
async def chat_endpoint(query: str):
    return {"reply": f"RAG Assistant response to: {query}"}
