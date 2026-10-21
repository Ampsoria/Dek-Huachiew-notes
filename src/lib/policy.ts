// Keep this version in sync with the current-policy checks in the Supabase migration.
export const POLICY_VERSION = '2026-10-21-2';

export function safeNextPath(value: string | null, fallback = '/me') {
  if (!value || !/^\/(?![\/\\])[^\\\r\n]*$/.test(value)) return fallback;
  if (/^\/(?:login|auth\/callback|policy\/accept)(?:[/?#]|$)/.test(value)) return fallback;
  return value;
}
