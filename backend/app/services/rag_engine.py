import logging
from sentence_transformers import SentenceTransformer
from groq import Groq
from app.core.config import settings
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RAGEngine:
    """Retrieval-Augmented Generation engine for the AI assistant."""
    
    def __init__(self):
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info("RAGEngine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize RAGEngine: {e}")
            raise
            
    def embed(self, text: str) -> List[float]:
        """Generates an embedding vector for a given text."""
        try:
            embedding = self.model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    def query(self, organizer_wallet: str, message: str, analytics: Dict[str, Any]) -> str:
        """Processes a chat query using RAG."""
        try:
            # 1. Embed message (stub for vector search integration)
            # vector = self.embed(message)
            
            # 2. Search documents (would use supabase_client.search_documents here)
            # context_docs = search_documents("some_id", vector)
            
            # 3. Build prompt
            system_prompt = (
                f"You are an AI assistant for an NFT ticketing platform organizer. "
                f"Organizer analytics: Total Volume: {analytics.get('total_volume')}, "
                f"Royalties: {analytics.get('royalties_earned')}, "
                f"Tickets Sold: {analytics.get('tickets_sold')}."
            )
            
            # 4. Call Groq
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                model="llama-3.3-70b-versatile",
            )
            
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Error querying LLM: {e}")
            return "I'm sorry, I am currently experiencing issues processing your request."
