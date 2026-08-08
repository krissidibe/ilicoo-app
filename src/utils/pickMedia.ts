import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export type PickedMedia = {
  uri: string;
  fileName?: string;
};

const launchCamera = async (): Promise<PickedMedia | null> => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Permission requise",
      "Autorisez l'accès à l'appareil photo pour continuer.",
    );
    return null;
  }
  if (Platform.OS === "android") {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }
  return {
    uri: result.assets[0].uri,
    fileName: result.assets[0].fileName ?? undefined,
  };
};

const launchLibrary = async (): Promise<PickedMedia | null> => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Permission requise",
      "Autorisez l'accès à la photothèque pour continuer.",
    );
    return null;
  }
  if (Platform.OS === "android") {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }
  return {
    uri: result.assets[0].uri,
    fileName: result.assets[0].fileName ?? undefined,
  };
};

const launchDocumentPicker = async (): Promise<PickedMedia | null> => {
  try {
    const DocumentPicker = await import("expo-document-picker");
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }
    return {
      uri: result.assets[0].uri,
      fileName: result.assets[0].name,
    };
  } catch {
    Alert.alert(
      "Fichiers",
      "La sélection de fichiers n'est pas disponible sur cet appareil. Utilisez la photothèque.",
    );
    return null;
  }
};

export const pickMediaFromDevice = (): Promise<PickedMedia | null> =>
  new Promise((resolve) => {
    Alert.alert("Ajouter un document", "Choisissez une source", [
      { text: "Annuler", style: "cancel", onPress: () => resolve(null) },
      {
        text: "Appareil photo",
        onPress: () => {
          void launchCamera().then(resolve);
        },
      },
      {
        text: "Photothèque",
        onPress: () => {
          void launchLibrary().then(resolve);
        },
      },
      {
        text: "Fichiers",
        onPress: () => {
          void launchDocumentPicker().then(resolve);
        },
      },
    ]);
  });
