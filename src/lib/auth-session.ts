import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_PREFIX = "ilicooapp";
const COOKIE_STORAGE_KEY = `${STORAGE_PREFIX}_cookie`;
const SESSION_COOKIE_NAME = "better-auth.session_token";
/** Aligné sur auth.ts session.expiresIn (30 jours) */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredCookie = {
  value: string;
  expires: string | null;
};

const normalizeStorageKey = (name: string): string =>
  name.replace(/:/g, "_");

/**
 * Persiste le jeton de session signé renvoyé par Better Auth (header set-auth-token).
 * Nécessaire sur React Native car Set-Cookie n’est pas toujours lisible via fetch.
 */
export async function persistBetterAuthSessionToken(
  signedToken: string,
): Promise<void> {
  if (!signedToken.trim() || Platform.OS === "web") {
    return;
  }

  const storageKey = normalizeStorageKey(COOKIE_STORAGE_KEY);
  let existing: Record<string, StoredCookie> = {};

  try {
    const raw = await SecureStore.getItemAsync(storageKey);
    if (raw) {
      existing = JSON.parse(raw) as Record<string, StoredCookie>;
    }
  } catch {
    existing = {};
  }

  existing[SESSION_COOKIE_NAME] = {
    value: signedToken.trim(),
    expires: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  await SecureStore.setItemAsync(storageKey, JSON.stringify(existing));
}

/** Corrige le cookie malformé « ; token=… » envoyé par @better-auth/expo. */
export function trimCookieHeader(cookie: string | null | undefined): string {
  if (!cookie) {
    return "";
  }
  return cookie.trim().replace(/^;\s*/, "");
}
