from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import MetaData, text

async def get_db_schema_text(session: AsyncSession) -> str:
    """Async function to inspect the database metadata and format the schema into a clean text string."""
    def reflect_schema(connection):
        metadata = MetaData()
        metadata.reflect(bind=connection)
        return metadata

    connection = await session.connection()
    metadata = await connection.run_sync(reflect_schema)
    
    schema_lines = []
    for table_name, table in metadata.tables.items():
        columns = [f"{col.name} ({col.type})" for col in table.columns]
        schema_lines.append(f"Table: {table_name}\nColumns: {', '.join(columns)}")
    return "\n\n".join(schema_lines)

async def execute_safe_query(session: AsyncSession, sql_query: str) -> list[dict]:
    """Async function to execute the validated, read-only SQL query and return results."""
    result = await session.execute(text(sql_query))
    return [dict(row) for row in result.mappings().all()]
