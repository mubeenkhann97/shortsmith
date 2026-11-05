export const SITE_NAME = "Shortsmith";

/** Operator identity. Set these for your deployment; empty values are hidden wherever they render. */
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || SITE_NAME;
export const COMPANY_REGISTRATION_NUMBER = process.env.NEXT_PUBLIC_COMPANY_REGISTRATION_NUMBER?.trim() || "";
export const COMPANY_REGISTERED_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || "";

/** Public contact addresses. Empty hides the contact lines that would show them. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";
export const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || SUPPORT_EMAIL;

export const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3107";
export const HOSTED_APP_URL = DEFAULT_SITE_URL;

/** This deployment's public source repository (AGPL-3.0 section 13). Empty hides the link. */
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || "";

/** The upstream project Shortsmith is based on. Always credited in the footer. */
export const UPSTREAM_NAME = "SupoClip";
export const UPSTREAM_REPO_URL = "https://github.com/FujiwaraChoki/supoclip";
export const UPSTREAM_LICENSE = "AGPL-3.0";

/** Where "view the source" links point: this deployment's repository, else the upstream one. */
export const SOURCE_REPO_URL = GITHUB_URL || UPSTREAM_REPO_URL;

/**
 * Optional App Store app id for a native client. Empty by default: no iOS app is advertised.
 * Server-side App Store billing (RevenueCat) keeps working without it.
 */
export const APP_STORE_ID = process.env.NEXT_PUBLIC_APP_STORE_ID?.trim() || "";

/** Opens the App Store's offer-code redemption for a creator's custom code; empty when no app is configured. */
export function appStoreRedeemUrl(code: string) {
  if (!APP_STORE_ID) return "";
  return `https://apps.apple.com/redeem?ctx=offercodes&id=${APP_STORE_ID}&code=${encodeURIComponent(code.toUpperCase())}`;
}

export function getSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).origin;
  } catch {
    return "http://localhost:3107";
  }
}
