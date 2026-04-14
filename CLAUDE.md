# ShopGraph — Project Rules

## Critical Product Rules

### Free Tier Must Work on ICP URLs (LAU-304)
The free tier's only job is to eliminate the buyer's objection "does this work on my URL?" If it fails on the URLs your ICP uses (B2B suppliers, large retailers), you are failing on qualified leads. A working demo at 25 calls beats a broken demo at 500. Never ship a demo that fails on the first click. The playground is the primary conversion path — if it doesn't work, nothing downstream converts.

Current state: Playground now uses `/api/playground` (full pipeline, 100/day IP throttle for testing). Free tier changed from 500 Schema.org-only to 50 full-pipeline calls/month.

### B2B Extraction — Verified Working Sites
8 sites verified live on leaderboard: moglix.com, haastooling.com, amleo.com, allbirds.com, discountcomputerdepot.com, uline.com, cpooutlets.com, maritool.com. These work today.

Sites like Grainger, Home Depot, Amazon, McMaster-Carr block serverless IPs. These have been REMOVED from the leaderboard. Do NOT add sites to the leaderboard unless extraction is verified via /api/playground. Do NOT claim RFC 9421 or Cloudflare registration will fix blocked sites — we have no evidence.

LAU-307: Apply to Cloudflare Signed Agents directory (high priority, unverified outcome)
LAU-308: Find and verify more B2B sites across verticals

### Banned Terms
Never use in any customer-facing copy: deterministic, guaranteed, scraping/scraper, bypass/circumvent, unblock, fighting, toll roads (commerce context), identity broker, OV identity, trust score, "the first" (unqualified)

### Banned Patterns
No "Stop doing X." No "Don't let Y happen." No fear-based framing. No negative assumptions about the developer's current state. No em dashes in blog posts. No "SceneInBloom." No "Built with Claude Code" footers.

### Scoring Schema Source of Truth
The source of truth for AgentReady scoring is `src/agent-ready.ts`. Dimension API names: structured_data_completeness, semantic_richness, ucp_compatibility, pricing_clarity, inventory_signal_quality, access_readiness. Weights: 0.30, 0.20, 0.20, 0.15, 0.15, 0.00. Score scale: 0-100. Per-field confidence: separate 0-1 scale. scoring_version: "2026-04-08-v1". All documentation pages must match these values.

## Design Rules

### Agentation is the Design Reference
shopgraph.dev matches agentation.com's design system: Inter font, rgba black palette, 0.8125rem headings with ::after flex line, flush-left nav with subnav TOC.

### Design QA Process
Never claim "matches Agentation" without side-by-side Playwright screenshots comparing specific properties (font size, weight, color, spacing, borders, indicators). Structure match is not style match. Use the `/design-qa` skill.

### Screenshots
Save Playwright screenshots to `.screenshots/` directory, not Downloads. Use `downloadsDir` parameter.

### Figma
Use Figma MCP to get exact styles, colors, and spacing when the user references Figma designs. The sidebar nav styles come from Figma (Phosphate logo, 13px nav items, #007AFF active state, #222 text).

## Architecture

### Branch Strategy
Work directly on `main`. The `feat/site-redesign` branch served its purpose and is merged. Production deploys from `main` to shopgraph.dev via Vercel.

### Site Structure
Vanilla HTML/CSS/JS site. No React, no Tailwind, no build step. Static files in `public/`. Styles in `public/styles/main.css`. Shared components in `public/components/` (nav.js, playground.js, code-highlight.js, diagram-animations.js).

### Diagram Animation System
Global system at `styles/diagram-animations.css` + `components/diagram-animations.js`. Use `dg-*` classes on diagram elements. Include both files on pages with diagrams. Animations should cycle continuously (infinite), not one-shot. Elements should animate in sequence, not simultaneously (LAU-303).

### Node Packages
- `packages/n8n-nodes-shopgraph/` — published to npm as n8n-nodes-shopgraph@1.0.0
- `packages/make-shopgraph/` — Make.com custom app, created in developer portal, needs scenario testing

## Linear

- Project: SpinOuts (ID: 52fb78a7-28c7-4d93-9973-00477f8d1337)
- Team: Laundromat (ID: 79695da0-4210-4342-8352-cab04a309699)
- LAU-283: n8n node — DONE
- LAU-285: Make.com app — needs testing
- LAU-303: Diagram animations — continuous cycling + per-element sequencing
- LAU-304: Free tier strategy gap — P1 URGENT

## n8n Safety Rules
See ~/.claude/CLAUDE.md for n8n execution budget rules and workflow safety protocol.
