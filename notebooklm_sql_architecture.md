# Architectural Specification: Text-to-SQL with Guardrails

## 1. Technical Stack & Core Libraries
- **Web Framework**: FastAPI, utilized for building high-performance, asynchronous RESTful APIs using standard Python type hints.
- **ASGI Server**: Uvicorn, serving as the asynchronous server gateway interface required to run the FastAPI application.
- **Database ORM & Reflection**: SQLAlchemy (Core/ORM), used for managing database connections, performing schema introspection (reflection), and executing validated queries safely.
- **SQL Parser & Validator**: sqlglot, a pure Python, no-dependency SQL parser, transpiler, and optimizer. It is used to generate Abstract Syntax Trees (ASTs) for programmatic introspection to detect and reject unsafe SQL syntax.
- **LLM Inference**: Ollama Python SDK (`ollama`) utilizing the `qwen2.5-coder:7b` model running locally. (Note: Ollama and its specific models are external dependencies defined by the MVP requirements and are not detailed in the provided source documentation).

## 2. Project Directory Structure
The application structure follows the domain-based separation of concerns principle, organizing modules logically by their technical purpose within the FastAPI ecosystem.

```
text-to-sql-guardrails/
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── db_service.py
│   │   ├── guardrail_service.py
│   │   └── sql_generator.py
│   └── main.py
├── .env
├── requirements.txt
└── devbox.json
```

## 3. Required Dependencies
The following packages must be included in `requirements.txt` to support the asynchronous web framework, database engine, SQL validation, and local LLM integration:
```text
fastapi[all]
uvicorn
sqlalchemy
sqlglot
ollama
pydantic-settings
```

## 4. Architectural Components & Function Signatures

### `app/core/config.py`
Handles externalized environment configuration (e.g., database connection strings) to prevent hardcoding sensitive variables.
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    OLLAMA_HOST: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5-coder:7b"

settings = Settings()
```

### `app/services/db_service.py`
Manages asynchronous database connectivity and schema reflection to retrieve database metadata.
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import MetaData

async def get_db_schema_text(session: AsyncSession) -> str:
    """Async function to inspect the database metadata and format the schema into a clean text string."""
    pass

async def execute_safe_query(session: AsyncSession, sql_query: str) -> list[dict]:
    """Async function to execute the validated, read-only SQL query and return results."""
    pass
```

### `app/services/sql_generator.py`
Leverages the local Ollama SDK via asynchronous I/O bounds to prevent blocking the main FastAPI event loop.
```python
import ollama
from app.core.config import settings

async def generate_sql(schema_text: str, user_query: str) -> str:
    """
    Async function using ollama.AsyncClient() to prompt qwen2.5-coder:7b.
    Must utilize strict system instructions demanding raw SQL code only, 
    with no conversational formatting.
    """
    pass
```

### `app/services/guardrail_service.py`
Utilizes sqlglot to parse the LLM-generated SQL and strictly enforce security rules via AST introspection.
```python
import sqlglot
from sqlglot.errors import ParseError

def validate_sql_ast(raw_sql: str, dialect: str = "sqlite") -> str:
    """
    Parses the SQL string using sqlglot.parse_one() to generate an AST.
    Recursively inspects nodes to verify it contains ONLY read-only operations (SELECT).
    Strictly blocks and raises an exception on DROP, DELETE, ALTER, UPDATE, or INSERT.
    """
    pass
```

### `app/main.py`
The FastAPI application entry point containing the pipeline logic.
```python
from fastapi import FastAPI, Depends, HTTPException, status
from app.services.db_service import get_db_schema_text, execute_safe_query
from app.services.sql_generator import generate_sql
from app.services.guardrail_service import validate_sql_ast

app = FastAPI(title="Text-to-SQL with Guardrails")

@app.post("/v1/query")
async def process_nl_query(user_query: str, db_session = Depends(get_db_session)):
    """
    FastAPI endpoint executing the full Text-to-SQL pipeline:
    1. get_db_schema_text(db_session)
    2. generate_sql(schema, user_query) locally via Ollama
    3. validate_sql_ast(generated_sql) via sqlglot
    4. execute_safe_query(db_session, valid_sql)
    5. Return JSON results
    """
    pass
```

## 5. Strict Constraints
- **100% Rejection of Non-SELECT Commands**: The `guardrail_service.py` must aggressively traverse the `sqlglot` Abstract Syntax Tree (AST). Any presence of mutating statements (e.g., `DROP`, `DELETE`, `ALTER`, `UPDATE`, `INSERT`) must immediately block execution and return an explicit validation error to the client.
- **AST Safety over Regex**: String-matching or regex is insufficient for SQL injection prevention. Validation must strictly rely on programmatic introspection of the parsed `sqlglot` expressions.
- **Graceful Local LLM Error Handling**: If the local Ollama instance is unreachable, times out, or fails to return a parseable response, the application must capture the connection error and raise a standard HTTPException (e.g., HTTP 503 Service Unavailable) instead of crashing the server process.
- **Lightweight System Prompts**: System prompts passed to `qwen2.5-coder:7b` must be highly optimized and concise. Supplying minimal but exact schema text ensures faster local inference times and minimizes context-window overflow.
