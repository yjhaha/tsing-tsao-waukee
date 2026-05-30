/**
 * Single source of truth for restaurant contact info.
 *
 * Previously the phone number was duplicated across 6+ files with three
 * different (mostly wrong) values. Import from here instead.
 *
 * Safe to import from both server and client components — no env reads
 * at module top level, so it won't accidentally leak to the client bundle.
 * Server-side callers can override the default via the RESTAURANT_PHONE env
 * var by using getRestaurantPhoneDisplay() instead of the constant.
 */

export const RESTAURANT_PHONE_DISPLAY = '(515) 987-6017'

/**
 * Derived from RESTAURANT_PHONE_DISPLAY. Stable as a constant because the
 * default doesn't change at runtime; use phoneToTelHref(custom) if you have
 * a different display string (e.g. from an env override).
 */
export const RESTAURANT_PHONE_TEL_HREF = phoneToTelHref(RESTAURANT_PHONE_DISPLAY)

export function phoneToTelHref(displayPhone: string): string {
  const digits = displayPhone.replace(/\D/g, '')
  const withCountryCode = digits.startsWith('1') ? digits : `1${digits}`
  return `tel:+${withCountryCode}`
}

/**
 * Server-side helper: returns RESTAURANT_PHONE env var if set, else the
 * baked-in default. Use this in server components / route handlers / email
 * templates so ops can override without a code change.
 */
export function getRestaurantPhoneDisplay(): string {
  return process.env.RESTAURANT_PHONE ?? RESTAURANT_PHONE_DISPLAY
}
