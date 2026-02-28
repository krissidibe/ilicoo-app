import { Platform } from "react-native";
import { authClient } from "../lib/auth-client";

export const apiFetch = async (endPoint: string, options: RequestInit = {}) => {
  const cookies = authClient.getCookie();
  //const BASE_API_URL = "http://10.0.2.2:3001";
  const apiUrl =
    Platform.OS === "ios"
      ? "http://localhost:3000/api/v1/"
      : "http://10.0.2.2:3000/api/v1/";

  const response = await fetch(`${apiUrl}${endPoint}`, {
    credentials: "omit",
    headers: {
      Cookie: cookies,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) errorMessage = errorData.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
};
