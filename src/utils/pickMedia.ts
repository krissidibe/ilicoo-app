import * as ImagePicker from "expo-image-picker";
import { ActionSheetIOS, Alert, Platform } from "react-native";

export type PickedMedia = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

type MediaSource = "camera" | "library" | "files";

const IMAGE_QUALITY = 0.8;

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  allowsMultipleSelection: false,
  quality: IMAGE_QUALITY,
  exif: false,
};

/** Laisse le time à l’ActionSheet / Alert de se fermer avant d’ouvrir un autre écran natif. */
const waitForNativeDismiss = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Platform.OS === "ios" ? 700 : 80);
  });

const toPickedMedia = (asset: ImagePicker.ImagePickerAsset): PickedMedia => ({
  uri: asset.uri,
  fileName: asset.fileName ?? undefined,
  mimeType: asset.mimeType ?? undefined,
});

const launchCamera = async (): Promise<PickedMedia | null> => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Permission requise",
      "Autorisez l'accès à l'appareil photo dans les réglages pour continuer.",
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
  const asset = result.canceled ? undefined : result.assets?.[0];
  return asset?.uri ? toPickedMedia(asset) : null;
};

const launchLibrary = async (): Promise<PickedMedia | null> => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Permission requise",
      "Autorisez l'accès à la photothèque dans les réglages pour continuer.",
    );
    return null;
  }
  const result =
    await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
  const asset = result.canceled ? undefined : result.assets?.[0];
  return asset?.uri ? toPickedMedia(asset) : null;
};

const launchDocumentPicker = async (): Promise<PickedMedia | null> => {
  try {
    const DocumentPicker = await import("expo-document-picker");
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "application/pdf",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset?.uri) {
      return null;
    }
    return {
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType ?? undefined,
    };
  } catch {
    Alert.alert(
      "Fichiers",
      "La sélection de fichiers n'est pas disponible sur cet appareil. Utilisez la photothèque.",
    );
    return null;
  }
};

const launchSource = async (
  source: MediaSource,
): Promise<PickedMedia | null> => {
  await waitForNativeDismiss();
  try {
    if (source === "camera") {
      return await launchCamera();
    }
    if (source === "library") {
      return await launchLibrary();
    }
    return await launchDocumentPicker();
  } catch (error) {
    Alert.alert(
      "Erreur",
      error instanceof Error
        ? error.message
        : "Impossible d'ouvrir le sélecteur de fichiers",
    );
    return null;
  }
};

const askSource = (): Promise<MediaSource | null> =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (source: MediaSource | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(source);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Ajouter un document",
          options: ["Annuler", "Appareil photo", "Photothèque"],
          cancelButtonIndex: 0,
        },
        (index) => {
          const sources: (MediaSource | null)[] = [
            null,
            "camera",
            "library",
            "files",
          ];
          finish(sources[index] ?? null);
        },
      );
      return;
    }

    Alert.alert(
      "Ajouter un document",
      "Choisissez une source",
      [
        /* { text: "Fichiers", onPress: () => finish("files") }, */
        { text: "Photothèque", onPress: () => finish("library") },
        { text: "Appareil photo", onPress: () => finish("camera") },
      ],
      { cancelable: true, onDismiss: () => finish(null) },
    );
  });

export const pickMediaFromDevice = async (): Promise<PickedMedia | null> => {
  const source = await askSource();
  if (!source) {
    return null;
  }
  return launchSource(source);
};
