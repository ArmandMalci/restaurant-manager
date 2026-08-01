# Python Conventions

> Loaded when the touched file ends in `.py`. Extends `.claude/rules/coding_conventions.md`.

## Toolchain

- **`uv`** for env + dep management. Never `pip install` directly — use `uv pip` or `uv add`.
- **Ruff** for lint + format + import sort. Auto-fixed via post-Write hook (`uv run ruff check --fix && uv run ruff format`).
- **mypy** in strict mode for type checking. Also consider **Pyrite LSP** plugin for Claude Code (per `.claude/references/tooling-recommendations.md`).
- **pytest** for tests with `pytest-asyncio` for async.
- Python **3.12+** for `type` statement and improved generics syntax.

## Type system

- Type hints on every public function. Use modern syntax: `list[int]`, `dict[str, int]`, `X | None` (not `Optional[X]`).
- `Final` for module-level constants. `Literal` for narrow string enums.
- Prefer `dataclasses` (or `attrs`) for simple data; **pydantic** at IO boundaries (request bodies, env config, external APIs).
- `TypedDict` for dict-shaped data you can't yet make a dataclass. Avoid bare `dict[str, Any]`.

## Naming

- Modules and packages: `snake_case`.
- Classes: `PascalCase`.
- Functions / vars: `snake_case`.
- Constants: `UPPER_SNAKE`.
- Private: leading `_`. Never `__double_leading_unless_dunder`.

## Structure

- **One responsibility per module.** If a `models.py` grows past ~300 lines, split by domain.
- Keep IO at edges (FastAPI route handlers, CLI entry points). Pure logic in `core/` or `lib/`.
- `__init__.py` is for re-exports only. No logic.

## Testing

- `pytest` + `pytest-asyncio`. Real Postgres via Testcontainers — no DB mocks.
- Use `fixtures` for shared setup. Avoid `setUp/tearDown` style.
- Snapshot testing for ML outputs: `syrupy`.
- Property-based testing for parsers / serializers: `hypothesis`.

## Async

- `async def` end-to-end if the route is async. Don't mix blocking `requests` with `httpx` async.
- `asyncio.TaskGroup` over `asyncio.gather` for structured concurrency.

## Framework opinion

- **FastAPI** for HTTP APIs (Pydantic native, async, OpenAPI free).
- **Modal** for serverless inference / batch ML.
- **Temporal** or **Trigger.dev** for durable workflows.

## Patterns to avoid

- `print()` in production code (use `logging` / `structlog`).
- Mutable default args (`def f(xs=[])` is a bug).
- `from x import *`.
- Catching bare `except:` — name the exception.
- Synchronous DB calls inside async route handlers.
