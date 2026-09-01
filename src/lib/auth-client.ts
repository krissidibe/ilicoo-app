import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getAuthServerBaseUrl } from "./api-base-url";
import { persistBetterAuthSessionToken } from "./auth-session";

export const authClient = createAuthClient({
  baseURL: getAuthServerBaseUrl(),
  fetchOptions: {
    onSuccess: async (context) => {
      if (Platform.OS === "web") {
        return;
      }
      const authToken = context.response.headers.get("set-auth-token");
      if (authToken) {
        await persistBetterAuthSessionToken(authToken);
      }
    },
  },
  plugins: [
    inferAdditionalFields({
      user: {
        phoneDialCode: { type: "string", required: true }, // Match the type and required status
        phoneNumber: { type: "string", required: true },
        country: { type: "string", required: true },
        gender: { type: "string", required: true },
        isVerified: { type: "boolean", required: false },
      },
    }),
    expoClient({
      scheme: "ilicooapp",
      storagePrefix: "ilicooapp",
      storage: SecureStore,
    }),
  ],
});
