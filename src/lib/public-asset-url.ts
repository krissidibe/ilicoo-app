import { getApiBaseUrl } from "./api-base-url";

/**
 * Résout une URL de fichier uploadé (chemin relatif ou URL absolue legacy).
 */
export function resolvePublicAssetUrl(
  url?: string | null,
): string | null {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${getApiBaseUrl()}${trimmed}`;
  }

  return trimmed;
}
