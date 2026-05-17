# AQA Vocabulary Parser Specification

This is the contract for parsing the AQA GCSE Spanish (8692) specification vocabulary list into JSON. The MCP server's `get_vocabulary` tool consumes data matching this exact shape. When the parser runs, it must produce files matching this contract — no more, no less.

## Output structure

One JSON file per AQA theme, in `data/vocab/`. File naming: `<theme_id>.json`.

Each file contains an array of vocabulary objects.

## Vocabulary object schema

```json
{
  "word_id": "string, unique across all themes, format: <theme_short>_<tier>NNN",
  "spanish": "string, the Spanish word or phrase",
  "english": "string, the English translation",
  "word_type": "noun | verb | adjective | adverb | phrase | preposition | conjunction",
  "gender": "m | f | null (only for nouns; null for non-nouns)",
  "theme": "string, AQA theme identifier (see Themes below)",
  "subtopic": "string, sub-topic within theme",
  "tier": "foundation | higher",
  "example_sentence_es": "string, AQA-appropriate example",
  "example_sentence_en": "string, English translation of example"
}
```

## Required vs optional fields

**Required (must be non-empty):**
- word_id, spanish, english, word_type, theme, tier

**Optional (null is acceptable):**
- gender (only meaningful for nouns)
- subtopic (defaults to theme name if unknown)
- example_sentence_es, example_sentence_en (can be left blank if not in source)

## Themes (use exactly these identifiers)

The 2026 AQA spec organises vocabulary into themes. Use these snake_case identifiers:

- `identity_and_relationships`
- `healthy_living_and_lifestyle`
- `education_and_work`
- `free_time_and_entertainment`
- `customs_festivals_and_celebrations`
- `celebrity_culture`
- `travel_and_tourism`
- `media_and_technology`
- `the_environment`
- `social_issues`

If AQA's actual theme names differ from this list when parsing, update both this file AND the `get_vocabulary` tool description in `src/index.ts` to match.

## Tier semantics

- `foundation`: words required for Foundation tier (grades 1–5)
- `higher`: words required for Higher tier ONLY — i.e., advanced vocabulary not in the Foundation list

A Higher tier student should be assumed to know all Foundation words PLUS Higher words. The MCP tool handles this when `tier: "higher"` is requested by returning both Foundation and Higher words from the requested theme.

## word_id convention

Format: `<theme_prefix>_<tier_letter><sequence>`

- theme_prefix: 3-letter shorthand (env, ide, hea, edu, fre, cus, cel, tra, med, soc)
- tier_letter: f (foundation) or h (higher)
- sequence: zero-padded 3-digit number, unique within theme+tier

Examples: `env_f001`, `env_h001`, `ide_f042`

This makes IDs human-readable and stable across re-parses.

## Validation rules

The parser must enforce:

1. Every entry has all required fields populated
2. `tier` is exactly `"foundation"` or `"higher"` (lowercase)
3. `gender` is `"m"`, `"f"`, or `null` — never `"masculine"` or other variants
4. `theme` matches one of the 10 valid identifiers
5. No duplicate `word_id` values across all theme files
6. No duplicate `spanish` strings within the same tier (a word appearing in both Foundation and Higher is unusual but not blocked)

## Counts (for sanity checking after parse)

The 2026 AQA Spanish specification contains approximately:
- 1,200 Foundation tier words
- 500 additional Higher tier words

After parsing, total Foundation count should be in the 1,100–1,300 range and Higher additions in the 400–600 range. If counts are wildly off, the parse missed something — investigate before trusting the output.

## Source

The parser reads from the official AQA GCSE Spanish (8692) specification PDF, available at aqa.org.uk. Always parse from the official document, not third-party revision sites — third parties sometimes modify wording or miss tier markings.

## When this contract changes

Any change to required fields, theme identifiers, or tier semantics requires a corresponding update to:

1. `src/index.ts` — `get_vocabulary` tool description and input schema
2. `data/vocab_sample.json` — keep the sample matching the contract
3. This file — version bump at top
