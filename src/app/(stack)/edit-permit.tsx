import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { VerifiedBadge } from "@/src/components/VerifiedBadge";
import { resolvePublicAssetUrl } from "@/src/lib/public-asset-url";
import { uploadImageFile } from "@/src/services/upload.service";
import { getUser, updateProfile } from "@/src/services/user.service";
import { pickMediaFromDevice } from "@/src/utils/pickMedia";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type PermitFormValues = {
  image: string;
  identityPhoto: string;
  permitPhoto: string;
  permitPhotoBack: string;
  permitNumber: string;
};

type DocumentField = Exclude<keyof PermitFormValues, "permitNumber">;

const DOCUMENT_FIELDS: { name: DocumentField; label: string }[] = [
  { name: "image", label: "Photo d'identité" },
  { name: "identityPhoto", label: "Pièce d'identité" },
  { name: "permitPhoto", label: "Permis de conduire recto" },
  { name: "permitPhotoBack", label: "Permis de conduire verso" },
];

const toFormValues = (
  source?: Partial<PermitFormValues> | null,
): PermitFormValues => ({
  image: source?.image ?? "",
  identityPhoto: source?.identityPhoto ?? "",
  permitPhoto: source?.permitPhoto ?? "",
  permitPhotoBack: source?.permitPhotoBack ?? "",
  permitNumber: source?.permitNumber ?? "",
});

const mergeDocumentValues = (
  saved: PermitFormValues,
  current: PermitFormValues,
  field: DocumentField,
  next: string,
): PermitFormValues => {
  const pick = (key: DocumentField): string =>
    key === field ? next : current[key] || saved[key];
  return {
    image: pick("image"),
    identityPhoto: pick("identityPhoto"),
    permitPhoto: pick("permitPhoto"),
    permitPhotoBack: pick("permitPhotoBack"),
    permitNumber: current.permitNumber || saved.permitNumber,
  };
};

const DocumentUploadField = ({
  label,
  value,
  localPreviewUri,
  onRemove,
  uploading,
  busyLabel = "Envoi en cours...",
  onPick,
}: {
  label: string;
  value: string;
  localPreviewUri?: string | null;
  onRemove: () => void;
  uploading: boolean;
  busyLabel?: string;
  onPick: () => Promise<void>;
}) => {
  const remoteUrl = resolvePublicAssetUrl(value);
  const previewUri = localPreviewUri?.trim() || remoteUrl;
  const isPdf =
    (previewUri ?? "").toLowerCase().split("?")[0]?.endsWith(".pdf") ?? false;
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [previewUri]);

  return (
    <View>
      <Text className="mb-1 text-xs text-muted-foreground">{label}</Text>
      {previewUri || uploading ? (
        <View
          style={{
            width: "100%",
            height: 176,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#F3F4F6",
            marginBottom: 8,
          }}
        >
          {previewUri && isPdf ? (
            <View className="flex-row flex-1 justify-center items-center px-4">
              <Ionicons
                name="document-text-outline"
                size={28}
                color="#6366f1"
              />
              <Text className="ml-2 text-sm">Document PDF envoyé</Text>
            </View>
          ) : previewUri && !failed ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: "100%", height: 176 }}
              contentFit="contain"
              cachePolicy="memory-disk"
              onError={() => setFailed(true)}
            />
          ) : previewUri ? (
            <View className="flex-1 justify-center items-center px-4">
              <Ionicons name="image-outline" size={28} color="#6366f1" />
              <Text className="mt-2 text-sm text-center text-muted-foreground">
                Document enregistré
              </Text>
            </View>
          ) : null}
          {uploading ? (
            <View
              style={StyleSheet.absoluteFill}
              className="justify-center items-center bg-black/50"
            >
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="mt-2 text-sm font-medium text-white">
                {busyLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <TouchableOpacity
        className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
        disabled={uploading}
        onPress={() => void onPick()}
      >
        <View className="flex-row flex-1 items-center">
          {uploading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Ionicons
              name={value ? "checkmark-circle-outline" : "cloud-upload-outline"}
              size={18}
              color={value ? "#10b981" : "#6366f1"}
            />
          )}
          <Text className="ml-2 text-sm">
            {uploading
              ? busyLabel
              : value
                ? "Document ajouté"
                : "Choisir un fichier"}
          </Text>
        </View>
        {uploading ? null : (
          <Text className="text-xs font-semibold text-primary">
            {value ? "Remplacer" : "Uploader"}
          </Text>
        )}
      </TouchableOpacity>
      {value && !uploading ? (
        <TouchableOpacity onPress={onRemove} className="mt-2">
          <Text className="text-xs text-red-500">Retirer le document</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const EditPermitScreen = () => {
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    ...getUser(),
    refetchOnMount: "always",
  });
  const queryClient = useQueryClient();
  const [uploadingField, setUploadingField] = React.useState<
    keyof PermitFormValues | null
  >(null);
  const [busyLabel, setBusyLabel] = React.useState("Envoi en cours...");
  const [localPreviews, setLocalPreviews] = React.useState<
    Partial<Record<DocumentField, string>>
  >({});
  const skipServerSync = React.useRef(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isDirty },
    reset,
  } = useForm<PermitFormValues>({
    defaultValues: toFormValues(),
  });

  const applySavedUser = useCallback(
    (saved: PermitFormValues): void => {
      queryClient.setQueryData(["user"], (current: typeof user) => ({
        ...(current ?? {}),
        ...saved,
      }));
      reset(saved);
    },
    [queryClient, reset],
  );

  React.useEffect(() => {
    if (!user || skipServerSync.current) {
      return;
    }
    const next = toFormValues(user);
    const typedPermitNumber = getValues("permitNumber");
    reset({
      ...next,
      permitNumber: typedPermitNumber || next.permitNumber,
    });
  }, [user, reset, getValues]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const persistDocuments = async (values: PermitFormValues): Promise<void> => {
    const saved = await updateProfile({
      image: values.image || null,
      identityPhoto: values.identityPhoto || null,
      permitPhoto: values.permitPhoto || null,
      permitPhotoBack: values.permitPhotoBack || null,
      permitNumber: values.permitNumber || null,
    });
    applySavedUser(toFormValues(saved));
  };

  const clearLocalPreview = (field: DocumentField): void => {
    setLocalPreviews((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handlePickDocument = async (field: DocumentField): Promise<void> => {
    if (uploadingField) {
      return;
    }
    const picked = await pickMediaFromDevice();
    if (!picked?.uri) {
      return;
    }
    setLocalPreviews((current) => ({ ...current, [field]: picked.uri }));
    setBusyLabel("Envoi en cours...");
    setUploadingField(field);
    skipServerSync.current = true;
    try {
      const uploadedUrl = await uploadImageFile(picked.uri, {
        fileName: picked.fileName,
        mimeType: picked.mimeType,
        folder: "documents",
      });
      const nextValues = mergeDocumentValues(
        toFormValues(user),
        getValues(),
        field,
        uploadedUrl,
      );
      setValue(field, uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
      await persistDocuments(nextValues);
    } catch (error) {
      clearLocalPreview(field);
      Alert.alert(
        "Erreur",
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer le fichier",
      );
    } finally {
      skipServerSync.current = false;
      setUploadingField(null);
    }
  };

  const removeDocument = async (field: DocumentField): Promise<void> => {
    if (uploadingField) {
      return;
    }
    clearLocalPreview(field);
    setBusyLabel("Suppression...");
    setUploadingField(field);
    skipServerSync.current = true;
    try {
      const nextValues = mergeDocumentValues(
        toFormValues(user),
        getValues(),
        field,
        "",
      );
      setValue(field, "", { shouldDirty: false });
      await persistDocuments(nextValues);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error
          ? error.message
          : "Impossible de retirer le document",
      );
    } finally {
      skipServerSync.current = false;
      setUploadingField(null);
    }
  };

  const confirmRemoveDocument = (field: DocumentField, label: string): void => {
    Alert.alert(
      "Retirer le document",
      `Voulez-vous vraiment retirer « ${label} » ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: () => {
            void removeDocument(field);
          },
        },
      ],
    );
  };

  const hasDocuments = Boolean(user?.permitPhoto && user?.identityPhoto);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (saved) => {
      applySavedUser(toFormValues(saved));
      Alert.alert("Succès", "Vos documents ont été enregistrés.");
      router.back();
    },
    onError: (error) => {
      Alert.alert(
        "Erreur",
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour",
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate({
      image: values.image || null,
      identityPhoto: values.identityPhoto || null,
      permitPhoto: values.permitPhoto || null,
      permitPhotoBack: values.permitPhotoBack || null,
      permitNumber: values.permitNumber || null,
    });
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-5 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Mes documents</Text>
          <View className="w-6" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-2 items-center p-3 mb-4 rounded-xl border border-primary/20 bg-primary/5">
          {user?.isVerified ? (
            <>
              <VerifiedBadge size={18} />
              <Text className="flex-1 text-sm font-medium text-primary">
                Profil vérifié par l&apos;équipe Ilicoo
              </Text>
            </>
          ) : hasDocuments ? (
            <Text className="flex-1 text-sm text-amber-700">
              Documents envoyés — validation administrateur en cours
            </Text>
          ) : (
            <Text className="flex-1 text-sm text-muted-foreground">
              Ajoutez votre permis et votre pièce d&apos;identité pour être
              vérifié.
            </Text>
          )}
        </View>

        <Text className="mb-4 text-sm text-muted-foreground">
          Uploadez vos documents depuis l&apos;appareil photo, la photothèque ou
          les fichiers du téléphone.
        </Text>

        <View className="gap-4">
          {DOCUMENT_FIELDS.map((document) => (
            <Controller
              key={document.name}
              control={control}
              name={document.name}
              render={({ field: { value } }) => {
                const savedValue = user?.[document.name] ?? "";
                return (
                  <DocumentUploadField
                    label={document.label}
                    value={value || savedValue}
                    localPreviewUri={localPreviews[document.name]}
                    onRemove={() =>
                      confirmRemoveDocument(document.name, document.label)
                    }
                    uploading={uploadingField === document.name}
                    busyLabel={busyLabel}
                    onPick={() => handlePickDocument(document.name)}
                  />
                );
              }}
            />
          ))}

          <Controller
            control={control}
            name="permitNumber"
            render={({ field: { onChange, value } }) => (
              <View>
                <Text className="mb-1 text-xs text-muted-foreground">
                  Numéro de permis
                </Text>
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ex: ML-2024-00981"
                />
                {errors.permitNumber ? (
                  <Text className="mt-1 text-xs text-red-500">
                    {errors.permitNumber.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </View>
      </ScrollView>

      <View className="absolute right-0 bottom-0 left-0 px-5 pt-3 pb-5 bg-white border-t border-gray">
        <Button
          className="rounded-xl"
          onPress={() => void onSubmit()}
          disabled={
            !isDirty || updateMutation.isPending || uploadingField !== null
          }
        >
          <Text>
            {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default EditPermitScreen;
