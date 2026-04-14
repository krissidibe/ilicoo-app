import Constants from "expo-constants";
import { Platform } from "react-native";

const LOCAL_API_PORT = "3000";
const API_PREFIX = "/api/v1/";

const extractDevHost = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri ?? null;
  if (!hostUri) {
    return null;
  }

  const [host] = hostUri.split(":");
  return host || null;
};

export const getApiBaseUrl = (): string => {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const authOnly = process.env.EXPO_PUBLIC_BETTER_AUTH_URL?.trim();
  if (authOnly) {
    return authOnly.replace(/\/$/, "");
  }

  const devHost = extractDevHost();
  if (devHost) {
    return `http://${devHost}:${LOCAL_API_PORT}`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
};

/**
 * Better Auth `baseURL` (same origin as `BETTER_AUTH_URL` on the server).
 * Prefer `EXPO_PUBLIC_BETTER_AUTH_URL` so it always matches the Next app URL
 * (avoids localhost vs LAN IP mismatches for OAuth redirects).
 */
export const getAuthServerBaseUrl = (): string => {
  const explicit = process.env.EXPO_PUBLIC_BETTER_AUTH_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return getApiBaseUrl();
};

export const getApiV1BaseUrl = (): string => `${getApiBaseUrl()}${API_PREFIX}`;
