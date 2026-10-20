import { getApiV1BaseUrl } from "../lib/api-base-url";
import { buildAuthRequestHeaders } from "../lib/auth-session";

export type UploadFolder = "vehicles" | "documents";

export type UploadImageOptions = {
  fileName?: string;
  mimeType?: string;
  folder?: UploadFolder;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

const extensionOf = (name: string): string | undefined => {
  const cleanName = name.split("?")[0] ?? name;
  const ext = cleanName.split(".").pop()?.toLowerCase();
  return ext && ext !== cleanName.toLowerCase() ? ext : undefined;
};

const resolveMimeType = (fileName: string, mimeType?: string): string => {
  if (mimeType && EXTENSION_BY_MIME[mimeType]) {
    return mimeType;
  }
  const ext = extensionOf(fileName);
  return (ext && MIME_BY_EXTENSION[ext]) || "image/jpeg";
};

const buildFileName = (
  localUri: string,
  mime: string,
  name?: string,
): string => {
  const base = name?.trim() || localUri.split("/").pop() || "document";
  if (extensionOf(base)) {
    return base;
  }
  return `${base}.${EXTENSION_BY_MIME[mime] ?? "jpg"}`;
};

const readUploadError = async (res: Response): Promise<string> => {
  if (res.status === 413) {
    return "Fichier trop volumineux pour le serveur (max 5 Mo).";
  }
  if (res.status === 401) {
    return "Session expirée, reconnectez-vous.";
  }
  try {
    const errJson = (await res.json()) as { error?: string };
    if (errJson?.error) {
      return errJson.error;
    }
  } catch {
    // réponse non JSON (ex. page nginx)
  }
  return `Échec de l'envoi (code ${res.status})`;
};

const normalizeFileUri = (uri: string): string => {
  const trimmed = uri.trim();
  if (
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content:") ||
    trimmed.startsWith("ph://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `file://${trimmed}`;
  }
  return trimmed;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const readLocalFileAsBase64 = async (uri: string): Promise<string> => {
  const res = await fetch(normalizeFileUri(uri));
  if (!res.ok) {
    throw new Error("Impossible de lire le fichier sélectionné.");
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error("Fichier vide.");
  }
  return arrayBufferToBase64(buffer);
};

/**
 * Envoie un fichier vers POST /api/v1/upload et renvoie son chemin public relatif (/uploads/...).
 * JSON + base64 : le FormData `{ uri, name, type }` casse fetch sur RN New Architecture.
 */
export const uploadImageFile = async (
  localUri: string,
  options: UploadImageOptions = {},
): Promise<string> => {
  const mime = resolveMimeType(options.fileName ?? localUri, options.mimeType);
  const fileName = buildFileName(localUri, mime, options.fileName);
  const fileBase64 = await readLocalFileAsBase64(localUri);

  let res: Response;
  try {
    res = await fetch(`${getApiV1BaseUrl()}upload`, {
      method: "POST",
      credentials: "omit",
      headers: buildAuthRequestHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        fileBase64,
        fileName,
        mimeType: mime,
        folder: options.folder ?? "vehicles",
      }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Impossible de joindre le serveur. Vérifiez votre connexion. (${detail})`,
    );
  }

  if (!res.ok) {
    throw new Error(await readUploadError(res));
  }

  const json = (await res.json()) as {
    success: boolean;
    data?: { url: string; path: string };
    error?: string;
  };
  if (!json.success || !json.data?.url) {
    throw new Error(json.error ?? "Réponse d'upload invalide");
  }
  return json.data.path ?? json.data.url;
};
