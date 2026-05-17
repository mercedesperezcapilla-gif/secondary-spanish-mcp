# secondary-spanish-mcp

An MCP server exposing secondary school Spanish curriculum data as tools callable from Claude Code, Claude Desktop, or any MCP client.

**Status:** Week 1 build — `get_vocabulary` tool against a hand-curated 12-word environment sample. Full vocabulary parse comes Week 2.

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/secondary-spanish-mcp.git
cd secondary-spanish-mcp

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Verify it runs (will hang waiting for MCP messages on stdin — that's correct)
npm start
# Press Ctrl+C to exit
```

---

## Wire to Claude Code

The fastest way — use the CLI command (no JSON editing needed):

```bash
claude mcp add secondary-spanish /absolute/path/to/secondary-spanish-mcp/dist/index.js
```

Use `pwd` inside the repo to get the absolute path, then substitute it in.

Restart Claude Code, open a new session and try:

> Get me 5 foundation environment words

Claude should call `get_vocabulary` and return data.

### Manual alternative

If you prefer to edit config directly, add this to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "secondary-spanish": {
      "command": "node",
      "args": ["/absolute/path/to/secondary-spanish-mcp/dist/index.js"]
    }
  }
}
```

---

## Stress test (tool description quality check)

The quality of the tool description determines whether Claude picks the right tool. Test it by asking the same need 5 different ways:

1. "Get me 5 foundation environment words"
2. "What environment vocabulary should a Higher tier student know?"
3. "Show me Spanish words about pollution and recycling"
4. "I need secondary school vocab about el medio ambiente"
5. "Give me some sustainability terms in Spanish"

If any of these doesn't trigger `get_vocabulary`, the description is the bug. Edit `src/index.ts`, rebuild, retest.

---

## Project structure

```
secondary-spanish-mcp/
├── package.json          # type: module; MCP SDK 1.x; zod
├── tsconfig.json         # Node16 module resolution (required by SDK)
├── src/
│   └── index.ts          # Server + get_vocabulary tool
├── data/
│   ├── vocab_sample.json # 12 hand-curated environment words (Week 1)
│   └── PARSER_SPEC.md    # Contract the Week 2 parser must produce
└── dist/                 # Compiled output (gitignored)
```

---

## Roadmap

| Week | Add | CCA domain practised |
|------|-----|----------------------|
| 1 | `get_vocabulary` (this) | Tool Design (18%) |
| 2 | Parse full vocabulary + `get_grammar_topic` | Tool Design |
| 3–4 | No new tools — Agentic Architecture study | Agentic (27%) |
| 5 | Gap analyser (separate Claude Code project) | Claude Code Config (20%) |
| 6 | Skills, slash commands, CLAUDE.md hierarchy | Claude Code Config |
| 7 | Zod refinements + structured output patterns | Prompt Engineering (20%) |
| 8 | `get_examiner_tip`, `get_pronunciation_focus`, MCP resources | Tool Design polish |
| 9 | RAG study — separate exercise | Context Management (15%) |

---

## Notes

- **Stdio transport, not HTTP.** Local-only personal use; no auth, no hosting. Migrate to Streamable HTTP only when an external surface needs to call the server.
- **Logs go to stderr.** stdout is the MCP protocol channel — anything written there breaks the connection.
- **Higher tier returns Foundation + Higher.** Higher students need to know everything Foundation students do; the tool reflects that.
