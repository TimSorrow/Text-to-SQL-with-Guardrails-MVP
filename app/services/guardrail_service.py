import sqlglot
import sqlglot.expressions as exp
from sqlglot.errors import ParseError

def validate_sql_ast(raw_sql: str, dialect: str = "sqlite") -> str:
    """
    Parses the SQL string using sqlglot.parse_one() to generate an AST.
    Recursively inspects nodes to verify it contains ONLY read-only operations (SELECT).
    Strictly blocks and raises an exception on DROP, DELETE, ALTER, UPDATE, or INSERT.
    """
    try:
        expression = sqlglot.parse_one(raw_sql, read=dialect)
    except ParseError as e:
        raise ValueError(f"Failed to parse SQL query: {e}")

    # Define forbidden mutating nodes in the AST
    forbidden_types = (
        exp.Drop,
        exp.Delete,
        exp.Alter,
        exp.Update,
        exp.Insert,
        exp.Create,
        exp.Merge,
        exp.Command,
        exp.Transaction,
        exp.Commit,
        exp.Rollback,
    )

    # Walk the AST and verify no forbidden node types exist
    for node in expression.walk():
        if isinstance(node, forbidden_types):
            raise ValueError(
                f"Security Guardrail Violation: Mutating/Unsafe node type '{node.__class__.__name__}' detected in query."
            )

    return raw_sql

