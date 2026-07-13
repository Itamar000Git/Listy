/**
 * Shared password policy (specification §7.2): a simple minimum length,
 * no mandatory character-class requirements. Deliberately isomorphic
 * (no server-only/client-only marker) since it's used by client-side
 * form validation only — passwords are never sent to a Next.js API
 * route.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export const PASSWORD_HINT_HE = `לפחות ${PASSWORD_MIN_LENGTH} תווים`;

export function isPasswordValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}
