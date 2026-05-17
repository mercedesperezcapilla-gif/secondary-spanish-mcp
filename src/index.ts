#!/usr/bin/env node
/**
 * GCSE Spanish Master MCP Server
 *
 * Exposes AQA-aligned GCSE Spanish curriculum data as MCP tools, callable
 * from any MCP client (Claude Code, Claude Desktop, Cursor).
 *
 * Week 1 scope: get_vocabulary tool against vocab_sample.json.
 * Week 2: parse real AQA spec, swap data source, add get_grammar_topic.
 *
 * Architecture choice: this is a stdio MCP server, not Streamable HTTP.
 * Stdio is correct for local-only personal use during the build phase.
 * Migrate to Streamable HTTP only when external surface needs to call it.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ----- Data loading -----

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = join(__dirname, "..", "data", "vocab_sample.json");

type VocabularyEntry = {
  word_id: string;
  spanish: string;
  english: string;
  word_type: string;
  gender?: "m" | "f" | null;
  theme: string;
  subtopic: string;
  tier: "foundation" | "higher";
  example_sentence_es?: string;
  example_sentence_en?: string;
};

let vocabulary: VocabularyEntry[];
try {
  vocabulary = JSON.parse(readFileSync(SAMPLE_PATH, "utf-8"));
} catch (err) {
  console.error(`[gcse-spanish-master-mcp] Failed to load ${SAMPLE_PATH}:`, err);
  process.exit(1);
}

// Valid AQA themes - kept in sync with PARSER_SPEC.md
const VALID_THEMES = [
  "identity_and_relationships",
  "healthy_living_and_lifestyle",
  "education_and_work",
  "free_time_and_entertainment",
  "customs_festivals_and_celebrations",
  "celebrity_culture",
  "travel_and_tourism",
  "media_and_technology",
  "the_environment",
  "social_issues",
] as const;

// ----- Server setup -----

const server = new McpServer({
  name: "gcse-spanish-master",
  version: "0.1.0",
});

// ----- Tool: get_vocabulary -----
//
// CCA exam relevance: the description below is the highest-leverage artefact
// in this server. The exam tests whether you know that tool descriptions
// (not function names) drive model selection. This description includes:
//   - When to use (anchor to student need)
//   - Input formats (explicit valid values for theme)
//   - Tier semantics (Higher includes Foundation)
//   - Explicit boundaries against future tools (do NOT use for grammar)
//   - Return shape (so the model knows what it gets back)
//
// Stress-test this in Claude Code by asking the same question 5 different
// ways. If Claude doesn't call this tool every time, the description is
// the bug, not Claude.

server.registerTool(
  "get_vocabulary",
  {
    title: "Get AQA GCSE Spanish vocabulary",
    description: `Retrieves AQA-aligned GCSE Spanish vocabulary words filtered by theme and tier.

WHEN TO USE
Use this tool when the student needs vocabulary for a specific AQA theme, wants to study words at a particular tier (Foundation grades 1-5, Higher grades 4-9), or is preparing for a vocabulary-based exam task. Use this whenever the student says things like "vocab for X", "words about Y", "what should I know for Z theme", or "give me 10 environment words".

INPUTS
- theme: AQA theme identifier (snake_case). Valid values: identity_and_relationships, healthy_living_and_lifestyle, education_and_work, free_time_and_entertainment, customs_festivals_and_celebrations, celebrity_culture, travel_and_tourism, media_and_technology, the_environment, social_issues.
- tier: "foundation" or "higher". Higher tier returns Foundation vocabulary PLUS Higher-only advanced words (Higher students need to know both).
- limit: optional, max number of words to return. Defaults to 20.

RETURNS
A JSON object with:
  - words: array of vocabulary entries (spanish, english, word_type, gender, example sentences)
  - theme: echoed theme identifier
  - tier: echoed tier
  - total_matching: total entries matching the filter
  - returned: number actually returned (may be less than total if limit applies)
  - truncated: true if limit cut off results

DO NOT USE THIS TOOL FOR
- Grammar topics (verb tenses, agreement rules, sentence structure) - a separate get_grammar_topic tool will exist for that.
- Pronunciation guidance (how to say a sound) - a separate get_pronunciation_focus tool will exist for that.
- General Spanish dictionary lookups outside the AQA syllabus - this tool only returns AQA-listed vocabulary.

EXAMPLE QUERIES THAT SHOULD CALL THIS TOOL
- "Get me 5 foundation environment words"
- "What family vocabulary should a Higher tier student know?"
- "I need 10 vocabulary words about travel and tourism for revision"
- "Show me food and drink vocab from the healthy living theme"`,
    inputSchema: {
      theme: z
        .enum(VALID_THEMES)
        .describe(
          "AQA theme identifier in snake_case. Must be one of the 10 official AQA themes."
        ),
      tier: z
        .enum(["foundation", "higher"])
        .describe(
          "Foundation (grades 1-5) returns only Foundation vocab. Higher (grades 4-9) returns Foundation + Higher-only words."
        ),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum words to return. Defaults to 20, max 100."),
    },
  },
  async ({ theme, tier, limit }) => {
    // Filter logic: 'higher' tier returns BOTH foundation and higher words
    // because Higher students need to know everything Foundation students do
    // PLUS the Higher-only advanced vocabulary.
    const tierFilter = (entry: VocabularyEntry): boolean => {
      if (tier === "foundation") return entry.tier === "foundation";
      return true; // higher tier includes everything
    };

    const allMatches = vocabulary.filter(
      (entry) => entry.theme === theme && tierFilter(entry)
    );

    const returned = allMatches.slice(0, limit);
    const result = {
      words: returned,
      theme,
      tier,
      total_matching: allMatches.length,
      returned: returned.length,
      truncated: returned.length < allMatches.length,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    };
  }
);

// ----- Connect transport and run -----

const transport = new StdioServerTransport();
await server.connect(transport);

// Note: log to stderr, never stdout - stdout is the MCP protocol channel
console.error("[gcse-spanish-master-mcp] Server running on stdio");
