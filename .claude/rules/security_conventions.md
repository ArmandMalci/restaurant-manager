# Security Conventions

> Loaded when code touches authentication, user input, secrets, file paths, shell execution, or external APIs.

## The boundary rule

**Validate at the system edge — once. Trust internal callers.**

System edges:
- HTTP request bodies / query params / headers
- CLI args
- Env vars at startup
- External API responses
- File contents read from disk (when content shape matters)
- WebSocket / SSE messages

Once data is past the edge and typed, downstream code should NOT re-validate. That's defensive code for impossible cases — the rule we already have in `coding_conventions.md`.

## Input validation

**TypeScript:** Zod everywhere at boundaries.
```ts
const RequestSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

export const handler = async (req: Request) => {
  const body = RequestSchema.parse(await req.json()); // throws on bad input — that's correct
  // body is now strongly typed — no re-validation needed downstream
};
```

**Python:** Pydantic at boundaries.
```python
class CreateUser(BaseModel):
    email: EmailStr
    age: int = Field(ge=0, le=150)

@app.post("/users")
async def create_user(payload: CreateUser):
    # payload is validated by FastAPI before this function runs
    ...
```

## Path validation

When user input becomes a filesystem path: validate ALL of these before touching the FS.

1. **Resolve the path** (`path.resolve()` / `os.path.abspath()`)
2. **Reject `..` traversal** — check the resolved path starts with the allowed root
3. **Reject symlinks pointing outside the allowed root** (`fs.realpathSync` + prefix check)
4. **Reject filenames matching `.env`, `secrets`, `.pem`, `.key` patterns**

Wrap this in a `validatePath(input, allowedRoot)` helper called at the boundary. Don't sprinkle the checks through callers.

## Shell execution

**Never** pass unvalidated user input to a shell. Even with `shell: false`:
- Allow-list the executable. Never execute a path provided by the user.
- Use argv arrays, not strings: `execFile('git', ['log', userBranch])` not `exec('git log ' + userBranch)`.
- Reject arguments matching shell metacharacters even when using argv arrays — they're ammunition for downstream tools.

## Secrets

- **Never** in code, comments, or commit messages.
- **`.env` files** — gitignored. Use `.env.example` with empty values for shape documentation.
- **Validate at startup** that required env vars are set. Crash early, not at first use.
- **Rotate immediately** if a secret is exposed (logs, screenshots, accidental commit). Don't wait.
- **Scope tokens** to least privilege. GitHub PAT for "read repos" is different from "delete repos".

## SQL / DB

- **Parameterized queries always.** Never string-concatenate values into SQL.
- **Row-Level Security (RLS) in Postgres / Supabase** — enforce at DB layer, not app layer.
- **Limit by default.** Every SELECT against a user-exposed table has a `LIMIT` (default 100).

## Auth in the AI agent context

- **Don't put API keys in CLAUDE.md or skill files.** Load from `.env`.
- **Sub-agents inherit env vars** — assume they can see your `.env`. Treat that as the trust boundary.
- **MCPs** with write/admin scope need explicit per-task enable. Don't leave them enabled by default. (See `mcp-hygiene.md`.)

## When something goes wrong

If you (Claude) detect a likely security issue while editing:
1. STOP the edit.
2. Tell Armand the specific issue with file:line.
3. Wait for direction. Don't auto-fix security code without confirmation.

Likely-security-issue triggers:
- Plain HTTP where HTTPS is expected
- Hardcoded credentials, even "for testing"
- `eval` / `exec` on user input
- Disabled CORS / CSRF / signature verification
- Permissive regex on user input (`.*`)
