import { getSetCookie } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_PREFIX = "ilicooapp";
const COOKIE_STORAGE_KEY = `${STORAGE_PREFIX}_cookie`;
const SESSION_DATA_KEY = `${STORAGE_PREFIX}_session_data`;
const BEARER_TOKEN_KEY = `${STORAGE_PREFIX}_bearer_token`;
const SESSION_COOKIE_NAME = "better-auth.session_token";
/** Aligné sur auth.ts session.expiresIn (30 jours) */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredCookie = {
  value: string;
  expires: string | null;
};

const normalizeStorageKey = (name: string): string =>
  name.replace(/:/g, "_");

const cookieStorageKey = (): string =>
  normalizeStorageKey(COOKIE_STORAGE_KEY);

/** Corrige le cookie malformé « ; token=… » envoyé par @better-auth/expo. */
export function trimCookieHeader(cookie: string | null | undefined): string {
  if (!cookie) {
    return "";
  }
  return cookie.trim().replace(/^;\s*/, "");
}

export function getStoredAuthCookieHeader(): string {
  if (Platform.OS === "web") {
    return "";
  }
  try {
    const raw = SecureStore.getItem(cookieStorageKey());
    return trimCookieHeader(getCookieFromStore(raw ?? "{}"));
  } catch {
    return "";
  }
}

function getCookieFromStore(cookieJson: string): string {
  let parsed: Record<string, StoredCookie> = {};
  try {
    parsed = JSON.parse(cookieJson) as Record<string, StoredCookie>;
  } catch {
    return "";
  }
  return Object.entries(parsed)
    .filter(([, value]) => {
      if (!value.expires) {
        return true;
      }
      return new Date(value.expires).getTime() > Date.now();
    })
    .map(([key, value]) => `${key}=${value.value}`)
    .join("; ");
}

/**
 * Jeton Bearer (corps JSON sign-in) — lu par le plugin bearer côté serveur.
 */
export function getStoredBearerToken(): string {
  if (Platform.OS === "web") {
    return "";
  }
  try {
    return SecureStore.getItem(BEARER_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearStoredAuthSession(): void {
  if (Platform.OS === "web") {
    return;
  }
  try {
    SecureStore.setItem(cookieStorageKey(), "{}");
    SecureStore.setItem(SESSION_DATA_KEY, "{}");
    SecureStore.setItem(BEARER_TOKEN_KEY, "");
  } catch {
    // ignore
  }
}

export async function persistBetterAuthSessionToken(
  signedToken: string,
): Promise<void> {
  if (!signedToken.trim() || Platform.OS === "web") {
    return;
  }

  let existing: Record<string, StoredCookie> = {};
  try {
    const raw = SecureStore.getItem(cookieStorageKey());
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

  SecureStore.setItem(cookieStorageKey(), JSON.stringify(existing));
}

export async function persistBearerToken(token: string): Promise<void> {
  if (!token.trim() || Platform.OS === "web") {
    return;
  }
  SecureStore.setItem(BEARER_TOKEN_KEY, token.trim());
}

export async function persistSessionFromAuthResponse(context: {
  response: Response;
  data?: {
    token?: string;
    user?: unknown;
    session?: unknown;
  } | null;
}): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const authToken = context.response.headers.get("set-auth-token");
  if (authToken) {
    await persistBetterAuthSessionToken(authToken);
  } else {
    const setCookie = context.response.headers.get("set-cookie");
    if (setCookie) {
      const prev = SecureStore.getItem(cookieStorageKey()) ?? undefined;
      const merged = getSetCookie(setCookie, prev);
      SecureStore.setItem(cookieStorageKey(), merged);
    }
  }

  const bodyToken = context.data?.token;
  if (typeof bodyToken === "string" && bodyToken.length > 0) {
    await persistBearerToken(bodyToken);
  }

  if (context.data?.user) {
    const sessionPayload = context.data.session
      ? { session: context.data.session, user: context.data.user }
      : { user: context.data.user, session: null };
    SecureStore.setItem(SESSION_DATA_KEY, JSON.stringify(sessionPayload));
  }
}

export function buildAuthRequestHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const cookie = getStoredAuthCookieHeader();
  const bearer = getStoredBearerToken();

  if (cookie) {
    headers.Cookie = cookie;
  }
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  return headers;
}
