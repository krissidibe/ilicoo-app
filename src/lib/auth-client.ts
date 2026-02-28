import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // Base URL of your Better Auth backend.
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
