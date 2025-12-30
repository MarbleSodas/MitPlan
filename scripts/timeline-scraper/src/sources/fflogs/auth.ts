/**
 * FFLogs V2 API Authentication
 *
 * Supports two authentication methods:
 *
 * 1. Client Credentials Flow (recommended for public API access)
 *    - Requires client_id and client_secret
 *    - Used for accessing public reports at /api/v2/client
 *    - No browser/redirect needed
 *
 * 2. PKCE Flow (for user-specific private data)
 *    - Requires client_id with registered redirect URIs
 *    - Used for accessing private user reports at /api/v2/user
 *    - Requires browser authentication
 *
 * Documentation: https://www.fflogs.com/api/docs
 *
 * To get credentials:
 * 1. Log in to FFLogs
 * 2. Go to https://www.fflogs.com/api/clients
 * 3. Click "Create Client"
 * 4. Enter a name and redirect URIs (for PKCE)
 * 5. Use the provided client_id and client_secret
 */

import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import open from 'open';
import type {
  FFLogsTokenResponse,
} from '../../types/index.js';

const TOKEN_CACHE_DIR = join(homedir(), '.mitplan');
const TOKEN_CACHE_FILE = join(TOKEN_CACHE_DIR, 'fflogs-token.json');

interface TokenCache {
  access_token: string;
  expires_at: number;
  token_type: string;
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await mkdir(TOKEN_CACHE_DIR, { recursive: true });
  } catch {
    // Ignore if directory already exists
  }
}

/**
 * Load cached token from filesystem
 */
export async function loadCachedToken(): Promise<TokenCache | null> {
  try {
    const data = await readFile(TOKEN_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data) as TokenCache;

    // Check if token is expired
    if (parsed.expires_at < Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save token to filesystem cache
 */
async function saveTokenToCache(tokenData: FFLogsTokenResponse): Promise<void> {
  try {
    await ensureCacheDir();
    await writeFile(TOKEN_CACHE_FILE, JSON.stringify({
      access_token: tokenData.access_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      token_type: tokenData.token_type,
    } satisfies TokenCache), 'utf-8');
  } catch (error) {
    console.warn('Failed to cache token:', error);
  }
}

/**
 * Clear cached token
 */
export async function clearCachedToken(): Promise<void> {
  try {
    await unlink(TOKEN_CACHE_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// CLIENT CREDENTIALS FLOW (for public API access)
// ============================================================================

/**
 * Authenticate using Client Credentials Flow
 *
 * This is the recommended method for accessing public FFLogs reports.
 * Requires client_id and client_secret.
 *
 * @param clientId - Your FFLogs client ID
 * @param clientSecret - Your FFLogs client secret
 * @returns Access token
 */
export async function authenticateClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Check for cached valid token first
  const cached = await loadCachedToken();
  if (cached && cached.access_token) {
    return cached.access_token;
  }

  // Create basic auth header
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://www.fflogs.com/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FFLogs authentication failed: ${response.status}\n${error}\n\n` +
      `To get credentials:\n` +
      `1. Log in to https://www.fflogs.com\n` +
      `2. Go to https://www.fflogs.com/api/clients\n` +
      `3. Click "Create Client" and get your client_id and client_secret`);
  }

  const tokenData = await response.json() as FFLogsTokenResponse;
  await saveTokenToCache(tokenData);

  return tokenData.access_token;
}

// ============================================================================
// PKCE FLOW (for private user data)
// ============================================================================

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate the code challenge from the verifier
 */
function generateCodeChallenge(verifier: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return hash;
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Exchange authorization code for access token (PKCE)
 */
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string
): Promise<FFLogsTokenResponse> {
  const response = await fetch('https://www.fflogs.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${response.status} ${error}`);
  }

  return response.json() as Promise<FFLogsTokenResponse>;
}

/**
 * Authenticate using PKCE flow with a local HTTP server callback
 *
 * This is used for accessing private user reports.
 * Requires a client_id with registered redirect URIs.
 */
export async function authenticatePKCE(
  clientId: string,
  redirectUri: string = 'http://localhost:3850/callback'
): Promise<string> {
  // Check for cached valid token first
  const cached = await loadCachedToken();
  if (cached && cached.access_token) {
    return cached.access_token;
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  // Create authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: state,
  });

  const authUrl = `https://www.fflogs.com/oauth/authorize?${params.toString()}`;

  // Create a promise that resolves when we receive the callback
  const tokenPromise = new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        // Send response page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (error) {
          res.end('<h1>Authentication Failed</h1><p>Error: ' + error +
            '</p><p>Make sure your redirect URI is registered at https://www.fflogs.com/api/clients</p>' +
            '<p>You can close this window.</p>');
          reject(new Error(`OAuth error: ${error}`));
        } else if (code && returnedState === state) {
          res.end('<h1>Authentication Successful!</h1><p>You can close this window and return to the terminal.</p>');

          // Exchange code for token
          exchangeCodeForToken(code, clientId, redirectUri, verifier)
            .then(async (tokenData) => {
              await saveTokenToCache(tokenData);
              resolve(tokenData.access_token);
            })
            .catch(reject);
        } else {
          res.end('<h1>Authentication Failed</h1><p>State mismatch. Please try again.</p>');
          reject(new Error('State mismatch in OAuth callback'));
        }

        // Close the server after sending response
        setTimeout(() => server.close(), 100);
      }
    });

    server.listen(3850, () => {
      console.log(`Opening browser for FFLogs authentication...`);
      console.log(`If browser doesn't open, visit: ${authUrl}`);
    });
  });

  // Open browser
  try {
    await open(authUrl, { wait: false });
  } catch {
    console.log(`\nPlease open this URL in your browser:\n${authUrl}\n`);
  }

  return tokenPromise;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Get a valid access token
 *
 * Automatically uses Client Credentials Flow if both client_id and client_secret are provided.
 * Falls back to PKCE flow if only client_id is provided.
 *
 * @param clientId - Your FFLogs client ID
 * @param clientSecret - Your FFLogs client secret (optional, triggers PKCE if not provided)
 * @param forceRefresh - Force re-authentication even if cached token exists
 * @returns Access token
 */
export async function getAccessToken(
  clientId: string,
  clientSecret?: string,
  forceRefresh = false
): Promise<string> {
  if (!forceRefresh) {
    const cached = await loadCachedToken();
    if (cached && cached.access_token) {
      return cached.access_token;
    }
  }

  // Use Client Credentials Flow if secret is provided
  if (clientSecret) {
    return authenticateClientCredentials(clientId, clientSecret);
  }

  // Fall back to PKCE flow
  return authenticatePKCE(clientId);
}
