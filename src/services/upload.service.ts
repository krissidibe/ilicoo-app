import { buildAuthRequestHeaders } from "../lib/auth-session";
import { getApiV1BaseUrl } from "../lib/api-base-url";

const guessMime = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") {
    return "image/png";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  return "image/jpeg";
};

/**
 * Envoie une image vers POST /api/v1/upload, renvoie l’URL absolue du fichier hébergé.
 */
export const uploadImageFile = async (localUri: string): Promise<string> => {
  const fileName = localUri.split("/").pop() ?? "photo.jpg";
  const form = new FormData();
  form.append("file", {
    uri: localUri,
    name: fileName.includes(".") ? fileName : `photo.jpg`,
    type: guessMime(fileName),
  } as unknown as Blob);

  const res = await fetch(`${getApiV1BaseUrl()}upload`, {
    method: "POST",
    headers: buildAuthRequestHeaders(),
    body: form,
  });

  if (!res.ok) {
    let errorMessage = `Upload: ${res.status}`;
    try {
      const errJson = (await res.json()) as { error?: string };
      if (errJson?.error) {
        errorMessage = errJson.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const json = (await res.json()) as {
    success: boolean;
    data?: { url: string; path: string };
  };
  if (!json.success || !json.data?.url) {
    throw new Error("Réponse d’upload invalide");
  }
  // Stocker le chemin relatif en base (stable entre appareils / backoffice)
  return json.data.path ?? json.data.url;
};
