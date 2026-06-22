# Text-to-SQL with AST Guardrails MVP

A secure, high-performance, asynchronous Text-to-SQL service using FastAPI, SQLAlchemy, sqlglot, and local LLM execution via Ollama (configured with the `gemma4` model).

This service takes natural language queries from the user, retrieves the database schema via asynchronous reflection, prompts a local LLM to generate the corresponding SQL, validates the query against mutating operations using AST parsing (blocking non-SELECT commands), executes the safe query, and returns the results.

---

## Key Features

- **Asynchronous Execution**: Fully async workflow from API endpoints to database reflection and query execution.
- **AST-Based SQL Guardrails**: Employs programmatic Abstract Syntax Tree (AST) analysis via `sqlglot` to inspect queries. This strictly permits read-only `SELECT` statements and blocks mutating actions (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `CREATE`, etc.) at the AST level, avoiding fragile regex.
- **Local LLM Inference**: Interacts asynchronously with local Ollama instances running the `gemma4` model.
- **Database Schema Reflection**: Introspects database metadata automatically to provide contextual schema definitions to the LLM.

---

## Project Structure

```
text-to-sql-guardrails/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI endpoints & pipeline orchestration
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py          # Settings management via Pydantic
│   └── services/
│       ├── __init__.py
│       ├── db_service.py      # Async DB schema reflection & query execution
│       ├── guardrail_service.py # AST-based SQL query validation
│       └── sql_generator.py   # Ollama integration logic
├── .env.example
├── .gitignore
├── devbox.json
├── requirements.txt
└── README.md
```

---

## Tech Stack

- **Framework**: FastAPI (Asynchronous ASGI application)
- **Database ORM**: SQLAlchemy 2.0 (Async extension)
- **SQL Parser**: sqlglot (AST parsing & inspection)
- **LLM Client**: Ollama Python SDK
- **Database Engine**: SQLite (via `aiosqlite`)

---

## Setup & Installation

### Prerequisites

1. Install [Ollama](https://ollama.com/) and ensure the service is running.
2. Download the `gemma4` model:
   ```bash
   ollama pull gemma4
   ```

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TimSorrow/Text-to-SQL-with-Guardrails-MVP.git
   cd Text-to-SQL-with-Guardrails-MVP
   ```

2. **Configure environment variables**:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Adjust settings as necessary:
   ```env
   DATABASE_URL=sqlite+aiosqlite:///./test.db
   OLLAMA_HOST=http://localhost:11434
   LLM_MODEL=gemma4
   ```

3. **Install dependencies**:
   Using a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

---

## Running the Application

Start the FastAPI application using Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

Access the interactive API documentation (Swagger UI) at:
> **http://localhost:8000/docs**

---

## API Documentation

### **POST /v1/query**
Executes the Text-to-SQL pipeline.

#### **Request Parameters**
- `user_query` (query string): The natural language query.

#### **Example Request (curl)**
```bash
curl -X 'POST' \
  'http://localhost:8000/v1/query?user_query=show%20me%20all%20products%20costing%20more%20than%20600' \
  -H 'accept: application/json'
```

#### **Example Success Response (200 OK)**
```json
{
  "user_query": "show me all products costing more than 600",
  "generated_sql": "SELECT title, price FROM products WHERE price > 600",
  "results": [
    {
      "title": "Laptop",
      "price": 999
    }
  ]
}
```

#### **Example Guardrail Error Response (400 Bad Request)**
If the LLM returns a mutating SQL query or if a malicious payload is supplied:
```json
{
  "detail": "Guardrail validation failed: Security Guardrail Violation: Mutating/Unsafe node type 'Drop' detected in query."
}
```

---

## Security Model (Guardrails)

The validation layer inside `guardrail_service.py` programmatically parses the generated SQL query into an Abstract Syntax Tree (AST) using `sqlglot`. It recursively traverses all nodes in the AST and raises an error if it detects any statement of the following types:
- `DROP`
- `DELETE`
- `ALTER`
- `UPDATE`
- `INSERT`
- `CREATE`
- `MERGE`
- `COMMAND` / Transaction commands (`COMMIT`, `ROLLBACK`, etc.)

This mechanism prevents SQL injection and unintended data mutations, guaranteeing that only read-only queries are executed against the database.
