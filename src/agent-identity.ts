/**
 * Agent Identity Infrastructure (LAU-296)
 *
 * Implements:
 * - Ed25519 keypair management for ShopGraph's extraction service
 * - RFC 9421 HTTP Message Signatures for outbound requests
 * - Signature Agent Card and .well-known endpoint data
 */
import { createPrivateKey, createPublicKey, sign, generateKeyPairSync, KeyObject } from 'node:crypto';

// ── Keypair Management ────────────────────────────────────────────

let cachedPrivateKey: KeyObject | null = null;
let cachedPublicKeyJwk: Record<string, unknown> | null = null;

interface Ed25519Keypair {
  privateKey: KeyObject;
  publicKeyJwk: Record<string, unknown>;
}

/**
 * Load or generate the Ed25519 keypair.
 * In production, keys are loaded from environment variables.
 * In development, generates ephemeral keys.
 */
export function getKeypair(): Ed25519Keypair {
  if (cachedPrivateKey && cachedPublicKeyJwk) {
    return { privateKey: cachedPrivateKey, publicKeyJwk: cachedPublicKeyJwk };
  }

  const privKeyPem = process.env.SHOPGRAPH_ED25519_PRIVATE_KEY;

  if (privKeyPem) {
    // Load from environment (PEM-encoded PKCS8)
    cachedPrivateKey = createPrivateKey({
      key: privKeyPem,
      format: 'pem',
      type: 'pkcs8',
    });
    const pubKey = createPublicKey(cachedPrivateKey);
    cachedPublicKeyJwk = pubKey.export({ format: 'jwk' }) as Record<string, unknown>;
  } else {
    // Generate ephemeral keypair for development
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    cachedPrivateKey = privateKey;
    cachedPublicKeyJwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  }

  return { privateKey: cachedPrivateKey, publicKeyJwk: cachedPublicKeyJwk };
}

/**
 * Export the private key as PEM for storing in environment variables.
 * Only used during initial key generation.
 */
export function exportPrivateKeyPem(): string {
  const { privateKey } = getKeypair();
  return privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
}

// ── RFC 9421 HTTP Message Signatures ──────────────────────────────

/**
 * Create an RFC 9421 HTTP Message Signature for an outbound request.
 * Signs: method, target URI (path + query), and a created timestamp.
 *
 * Returns headers to attach to the outbound request.
 */
export function signRequest(method: string, url: string): Record<string, string> {
  const { privateKey } = getKeypair();
  const parsedUrl = new URL(url);
  const targetUri = parsedUrl.pathname + parsedUrl.search;
  const created = Math.floor(Date.now() / 1000);

  // Signature base per RFC 9421
  // Covered components: @method, @target-uri, @created
  const signatureBase = [
    `"@method": ${method.toUpperCase()}`,
    `"@target-uri": ${targetUri}`,
    `"@signature-params": ("@method" "@target-uri");created=${created};keyid="shopgraph-extractor-v1";alg="ed25519"`,
  ].join('\n');

  const sig = sign(null, Buffer.from(signatureBase), privateKey);
  const sigBase64 = sig.toString('base64');

  return {
    'Signature-Input': `sig1=("@method" "@target-uri");created=${created};keyid="shopgraph-extractor-v1";alg="ed25519"`,
    'Signature': `sig1=:${sigBase64}:`,
  };
}

// ── Signature Agent Card ──────────────────────────────────────────

/**
 * Generate the Signature Agent Card for shopgraph.dev.
 * Published at /.well-known/agent-card.json
 */
export function getAgentCard(): object {
  const { publicKeyJwk } = getKeypair();

  return {
    agent_name: 'ShopGraph Extractor',
    operator_uri: 'https://shopgraph.dev',
    contact: 'hi@kb.computer',
    purpose: 'Product data extraction and structuring for agent commerce workflows',
    expected_user_agents: ['ShopGraph/1.0'],
    rate_expectations: {
      max_requests_per_minute: 60,
      max_requests_per_day: 50000,
    },
    compliance: {
      robots_txt: true,
      crawl_delay: true,
      ai_crawl_control: true,
    },
    keys: [
      {
        kty: publicKeyJwk.kty,
        crv: publicKeyJwk.crv,
        x: publicKeyJwk.x,
        kid: 'shopgraph-extractor-v1',
        use: 'sig',
      },
    ],
  };
}

/**
 * Generate the HTTP Message Signatures Directory.
 * Published at /.well-known/http-message-signatures-directory
 */
export function getSignaturesDirectory(): object {
  const { publicKeyJwk } = getKeypair();

  return {
    keys: [
      {
        kty: publicKeyJwk.kty,
        crv: publicKeyJwk.crv,
        x: publicKeyJwk.x,
        kid: 'shopgraph-extractor-v1',
        use: 'sig',
        alg: 'EdDSA',
      },
    ],
  };
}
