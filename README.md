# secondary-spanish-mcp

An MCP server exposing secondary school Spanish curriculum data as tools callable from Claude Code, Claude Desktop, or any MCP client.

**Status:** Active build. Current tool: `get_vocabulary` — returns curriculum-aligned Spanish vocabulary by topic and tier (Foundation / Higher).

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/mercedesperezcapilla-gif/secondary-spanish-mcp.git
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
claude mcp add secondary-spanish node /absolute/path/to/secondary-spanish-mcp/dist/index.js
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

## How to call it

Once wired up, just ask Claude naturally. Example:

> Give me 5 words for environment for AQA GCSE higher tier

You should see the tool called and a response like this:

```
Called secondary-spanish (ctrl+o to expand)

┌───────────────────┬─────────────────┬─────────────────────────────────────────────────┐
│      Spanish      │     English     │                     Example                     │
├───────────────────┼─────────────────┼─────────────────────────────────────────────────┤
│ el medio ambiente │ the environment │ Tenemos que proteger el medio ambiente.          │
├───────────────────┼─────────────────┼─────────────────────────────────────────────────┤
│ reciclar          │ to recycle      │ Reciclo el plástico y el papel en casa.          │
├───────────────────┼─────────────────┼─────────────────────────────────────────────────┤
│ la basura         │ rubbish / waste │ Hay mucha basura en las calles.                  │
├───────────────────┼─────────────────┼─────────────────────────────────────────────────┤
│ la contaminación  │ pollution       │ La contaminación del aire es un problema grave.  │
├───────────────────┼─────────────────┼─────────────────────────────────────────────────┤
│ proteger          │ to protect      │ Debemos proteger los animales en peligro.        │
└───────────────────┴─────────────────┴─────────────────────────────────────────────────┘
```

The `Called secondary-spanish` line confirms the MCP tool fired. If you don't see it, the server isn't connected — check setup.

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
│   ├── vocab_sample.json # Curriculum-aligned vocabulary by topic
│   └── PARSER_SPEC.md    # Vocabulary data contract
└── dist/                 # Compiled output (gitignored)
```

---

## Coming next

`get_grammar_topic` tool — grammar topics linked to the AQA/Edexcel GCSE specification.

---

## Notes

- **Stdio transport, not HTTP.** Local-only personal use; no auth, no hosting. Migrate to Streamable HTTP only when an external surface needs to call the server.
- **Logs go to stderr.** stdout is the MCP protocol channel — anything written there breaks the connection.
- **Higher tier returns Foundation + Higher.** Higher students need to know everything Foundation students do; the tool reflects that.
