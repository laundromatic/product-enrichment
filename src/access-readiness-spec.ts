/**
 * ACCESS READINESS — Implementation Spec (build when feature flag activates)
 *
 * THIS FILE IS A SPEC, NOT RUNNING CODE.
 * It exists so that when `feature:access_readiness_active` trips in Redis
 * (automatically, when >10% of test corpus URLs require Web Bot Auth),
 * any engineer or Claude Code session can implement the real scorer
 * without needing context from the original design session.
 *
 * ═══════════════════════════════════════════════════════════════════
 * TRIGGER: The test runner (src/test-runner.ts) monitors outbound
 * fetch responses for Web Bot Auth headers. When >10% of corpus URLs
 * return 401+WWW-Authenticate, Signature-Input, or 402 Payment Required,
 * it sets `feature:access_readiness_active = true` in Redis and fires
 * an alert webhook.
 *
 * The AgentReady scorer (src/agent-ready.ts) reads this flag on cold
 * start and redistributes dimension weights. The access_readiness
 * dimension weight goes from 0.00 to 0.15. But the scorer currently
 * returns a constant score of 100 — this spec describes what it
 * SHOULD do when activated.
 * ═══════════════════════════════════════════════════════════════════
 *
 * ## What to implement in scoreAccessReadiness()
 *
 * Replace the constant `score: 100` with actual access probing.
 *
 * ### Pre-flight HEAD request
 * Before each extraction, send a HEAD request to the target URL.
 * Parse the response for access signals:
 *
 * | Header / Status           | Signal                    | Score Impact |
 * |---------------------------|---------------------------|-------------|
 * | 200 OK, no auth headers   | Fully open                | 100         |
 * | 200 + X-Robots-Tag: ai    | Monitored but open        | 85          |
 * | 200 + Signature-Input     | Prefers signed requests   | 70          |
 * | 401 + WWW-Authenticate    | Auth required             | 40          |
 * | 402 Payment Required      | Pay-per-crawl             | 30          |
 * | 403 Forbidden             | Blocked                   | 0           |
 * | 429 + Retry-After         | Rate limited              | 20          |
 *
 * ### With ShopGraph identity (signed request)
 * If the unsigned HEAD gets 401/403, retry with RFC 9421 signature
 * (already implemented in src/agent-identity.ts). Score based on
 * whether the signed request succeeds:
 *
 * | Unsigned | Signed        | Score | Label             |
 * |----------|---------------|-------|-------------------|
 * | 200      | n/a           | 100   | fully_open        |
 * | 401      | 200           | 70    | identity_cleared  |
 * | 401      | 401           | 20    | identity_rejected |
 * | 402      | 402           | 30    | payment_required  |
 * | 403      | 200           | 60    | identity_cleared  |
 * | 403      | 403           | 0     | blocked           |
 *
 * ### Output shape (already defined in AgentReady interface)
 * ```typescript
 * {
 *   score: 70,        // 0-100
 *   weight: 0.15,     // auto-set by feature flag
 *   weighted_contribution: 10.5,
 *   details: {
 *     access_level: 3,           // 0-5 scale
 *     access_label: 'identity_cleared',
 *     unsigned_status: 401,
 *     signed_status: 200,
 *     requires_payment: false,
 *     cloudflare_detected: true,
 *     feature_flag_active: true,
 *     note: 'Site requires RFC 9421 identity. ShopGraph signature accepted.'
 *   }
 * }
 * ```
 *
 * ### Behavioral reputation (phase 2 of this work)
 * After basic probing works:
 * - Respect Crawl-Delay and rate-limit headers
 * - Adaptive backoff on 429s
 * - Log request patterns per domain per hour
 * - Match actual behavior to Signature Agent Card declarations
 * - Store per-domain access history in Redis
 *
 * ### Files to modify
 * 1. src/agent-ready.ts — scoreAccessReadiness() function
 * 2. src/extract.ts — add optional pre-flight HEAD before fetchPage()
 * 3. src/agent-identity.ts — already has signRequest(), no changes needed
 *
 * ### Cost considerations
 * - HEAD request adds ~200ms latency per extraction
 * - Consider caching access probe results per domain (1-hour TTL)
 * - Store in Redis: `access:${domain}` → { status, timestamp, label }
 *
 * ### DO NOT
 * - Circumvent access controls (no proxy rotation, CAPTCHA solving)
 * - Spoof identity or user-agent
 * - Ignore Crawl-Delay or rate-limit headers
 * - Register under any org entity other than shopgraph.dev domain
 *
 * ### Test scenarios to add
 * - HEAD returns 200 → score 100
 * - HEAD returns 401, signed retry returns 200 → score 70
 * - HEAD returns 403, signed retry returns 403 → score 0
 * - HEAD returns 402 → score 30, details.requires_payment = true
 * - Cached access probe within TTL → skip HEAD, use cached score
 */

// This file intentionally contains no executable code.
// It is a self-documenting spec embedded in the codebase.
export {};
