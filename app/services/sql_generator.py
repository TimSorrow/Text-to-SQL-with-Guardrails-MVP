import ollama
from app.core.config import settings

async def generate_sql(schema_text: str, user_query: str) -> str:
    """
    Async function using ollama.AsyncClient() to prompt gemma4.
    Must utilize strict system instructions demanding raw SQL code only, 
    with no conversational formatting.
    """
    client = ollama.AsyncClient(host=settings.OLLAMA_HOST)
    
    system_prompt = (
        "You are a precise Text-to-SQL translator. "
        "Given the database schema below, translate the user's natural language request into a valid SQL query. "
        "Strictly return only the executable SQL query, without any explanation, markdown code blocks, backticks, or conversational text. "
        "Make sure to only generate read-only SELECT queries.\n\n"
        f"Database Schema:\n{schema_text}"
    )
    
    response = await client.chat(
        model=settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]
    )
    
    sql = response.message.content.strip()
    
    # Clean up code blocks if LLM outputs them despite system prompt
    if sql.startswith("```sql"):
        sql = sql[6:]
    elif sql.startswith("```"):
        sql = sql[3:]
    if sql.endswith("```"):
        sql = sql[:-3]
        
    return sql.strip()

