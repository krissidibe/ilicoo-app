import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "./api-base-url";

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
  plugins: [
    inferAdditionalFields({
      user: {
        phoneDialCode: { type: "string", required: true }, // Match the type and required status
        phoneNumber: { type: "string", required: true },
        country: { type: "string", required: true },
        gender: { type: "string", required: true },
      },
    }),
    expoClient({
      scheme: "ilicooapp",
      storagePrefix: "ilicooapp",
      storage: SecureStore,
    }),
  ],
});
