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

  const devHost = extractDevHost();
  if (devHost) {
    return `http://${devHost}:${LOCAL_API_PORT}`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
};

export const getApiV1BaseUrl = (): string => `${getApiBaseUrl()}${API_PREFIX}`;
