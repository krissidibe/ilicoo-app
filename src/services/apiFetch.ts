import { buildAuthRequestHeaders } from "../lib/auth-session";
import { getApiV1BaseUrl } from "../lib/api-base-url";

export const apiFetch = async (endPoint: string, options: RequestInit = {}) => {
  const apiUrl = getApiV1BaseUrl();

  const response = await fetch(`${apiUrl}${endPoint}`, {
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthRequestHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
    ...options,
  });
  if (!response.ok) {
    console.log("endPoint", response.ok);
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
