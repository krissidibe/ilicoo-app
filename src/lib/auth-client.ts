import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getAuthServerBaseUrl } from "./api-base-url";
import {
  buildAuthRequestHeaders,
  persistSessionFromAuthResponse,
} from "./auth-session";

export const authClient = createAuthClient({
  baseURL: getAuthServerBaseUrl(),
  fetchOptions: {
    onRequest: (context) => {
      if (Platform.OS === "web") {
        return;
      }
      const authHeaders = buildAuthRequestHeaders();
      for (const [key, value] of Object.entries(authHeaders)) {
        if (value) {
          context.headers.set(key, value);
        }
      }
    },
    onSuccess: async (context) => {
      await persistSessionFromAuthResponse(context);
    },
  },
  plugins: [
    inferAdditionalFields({
      user: {
        phoneDialCode: { type: "string", required: true },
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
