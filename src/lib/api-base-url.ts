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

const normalizeBaseUrl = (url: string): string => url.replace(/\/$/, "");

const resolveBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }

  const devHost = extractDevHost();
  if (devHost) {
    return `http://${devHost}:${LOCAL_API_PORT}`;
  }
  console.log("http://localhost:3000");

  return "http://localhost:3000";
};

export const getApiBaseUrl = (): string => resolveBaseUrl();

/**
 * Better Auth `baseURL` — doit correspondre à `BETTER_AUTH_URL` sur le serveur.
 */
export const getAuthServerBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_BETTER_AUTH_URL?.trim();
  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }
  return getApiBaseUrl();
};

export const getApiV1BaseUrl = (): string => `${getApiBaseUrl()}${API_PREFIX}`;
