from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.services.db_service import get_db_schema_text, execute_safe_query
from app.services.sql_generator import generate_sql
from app.services.guardrail_service import validate_sql_ast

app = FastAPI(title="Text-to-SQL with Guardrails")

# Database session setup
engine = create_async_engine(settings.DATABASE_URL, echo=True)
async_session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

async def get_db_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session

@app.post("/v1/query")
async def process_nl_query(user_query: str, db_session: AsyncSession = Depends(get_db_session)):
    """
    FastAPI endpoint executing the full Text-to-SQL pipeline:
    1. get_db_schema_text(db_session)
    2. generate_sql(schema, user_query) locally via Ollama
    3. validate_sql_ast(generated_sql) via sqlglot
    4. execute_safe_query(db_session, valid_sql)
    5. Return JSON results
    """
    # 1. Get Schema Text
    try:
        schema_text = await get_db_schema_text(db_session)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve database schema: {str(e)}"
        )

    # 2. Generate SQL via Local LLM
    try:
        generated_sql = await generate_sql(schema_text, user_query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama inference error or service unavailable: {str(e)}"
        )

    # 3. Validate SQL AST via Guardrails
    try:
        valid_sql = validate_sql_ast(generated_sql)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guardrail validation failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during SQL AST validation: {str(e)}"
        )

    # 4. Execute Query Safely
    try:
        results = await execute_safe_query(db_session, valid_sql)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database execution error: {str(e)}"
        )

    # 5. Return Results
    return {
        "user_query": user_query,
        "generated_sql": generated_sql,
        "results": results
    }

