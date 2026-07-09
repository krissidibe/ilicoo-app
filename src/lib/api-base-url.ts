import Constants from "expo-constants";

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
  //return "http://localhost:3000";
  return "http://195.110.34.95";
};

/**
 * Better Auth `baseURL` (same origin as `BETTER_AUTH_URL` on the server).
 * Prefer `EXPO_PUBLIC_BETTER_AUTH_URL` so it always matches the Next app URL
 * (avoids localhost vs LAN IP mismatches for OAuth redirects).
 */
export const getAuthServerBaseUrl = (): string => {
  //return "http://localhost:3000";
  return "http://195.110.34.95";
};

export const getApiV1BaseUrl = (): string => `${getApiBaseUrl()}${API_PREFIX}`;
