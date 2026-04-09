/**
 * Admin Environment Variable Validation
 *
 * Validates required env vars at build & runtime.
 * If any required var is missing, the build/dev server will fail with a clear error.
 */

function requireEnv(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `\n❌ Missing required environment variable: ${name}\n` +
      `   Check your .env.local file in Admin-Vedashi.\n` +
      `   See .env.example for reference.\n`
    );
  }
  return value.trim();
}

// ─── Validate & Export ──────────────────────────────────────────────
export const env = {
  // Required — build will fail without this
  NEXT_PUBLIC_API_URL: requireEnv(process.env.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL'),
};

// Log validation success (only on server)
if (typeof window === 'undefined') {
  console.log('✅ Admin env validated');
}
