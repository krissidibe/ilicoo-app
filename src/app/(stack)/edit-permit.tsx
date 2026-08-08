import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { VerifiedBadge } from "@/src/components/VerifiedBadge";
import { getUser, updateProfile } from "@/src/services/user.service";
import { uploadImageFile } from "@/src/services/upload.service";
import { pickMediaFromDevice } from "@/src/utils/pickMedia";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

type PermitFormValues = {
  permitNumber: string;
  permitPhoto: string;
  permitPhotoBack: string;
  identityPhoto: string;
};

const DocumentUploadField = ({
  label,
  value,
  onChange,
  uploading,
  onPick,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  uploading: boolean;
  onPick: () => Promise<void>;
}) => {
  const isRemoteUrl = value.startsWith("http://") || value.startsWith("https://");

  return (
    <View>
      <Text className="mb-1 text-xs text-muted-foreground">{label}</Text>
      {isRemoteUrl ? (
        <Image
          source={{ uri: value }}
          className="mb-2 w-full h-36 rounded-xl bg-gray-100"
          resizeMode="cover"
        />
      ) : null}
      <TouchableOpacity
        className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
        disabled={uploading}
        onPress={() => void onPick()}
      >
        <View className="flex-row items-center">
          <Ionicons
            name={value ? "checkmark-circle-outline" : "cloud-upload-outline"}
            size={18}
            color={value ? "#10b981" : "#6366f1"}
          />
          <Text className="ml-2 text-sm">
            {uploading
              ? "Envoi en cours..."
              : value
                ? "Document ajouté"
                : "Choisir un fichier"}
          </Text>
        </View>
        <Text className="text-xs font-semibold text-primary">
          {value ? "Remplacer" : "Uploader"}
        </Text>
      </TouchableOpacity>
      {value ? (
        <TouchableOpacity onPress={() => onChange("")} className="mt-2">
          <Text className="text-xs text-red-500">Retirer le document</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const EditPermitScreen = () => {
  const { data: user, isLoading } = useQuery(getUser());
  const queryClient = useQueryClient();
  const [uploadingField, setUploadingField] = React.useState<
    keyof PermitFormValues | null
  >(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<PermitFormValues>({
    defaultValues: {
      permitNumber: "",
      permitPhoto: "",
      permitPhotoBack: "",
      identityPhoto: "",
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({
        permitNumber: user.permitNumber ?? "",
        permitPhoto: user.permitPhoto ?? "",
        permitPhotoBack: user.permitPhotoBack ?? "",
        identityPhoto: user.identityPhoto ?? "",
      });
    }
  }, [user, reset]);

  const handlePickDocument = async (
    field: keyof PermitFormValues,
  ): Promise<void> => {
    const picked = await pickMediaFromDevice();
    if (!picked?.uri) {
      return;
    }
    setUploadingField(field);
    try {
      const uploadedUrl = await uploadImageFile(picked.uri);
      setValue(field, uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Impossible d'envoyer le fichier",
      );
    } finally {
      setUploadingField(null);
    }
  };

  const hasDocuments = Boolean(
    user?.permitPhoto && user?.identityPhoto,
  );

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
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
      permitNumber: values.permitNumber || null,
      permitPhoto: values.permitPhoto || null,
      permitPhotoBack: values.permitPhotoBack || null,
      identityPhoto: values.identityPhoto || null,
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
          Uploadez vos documents depuis l&apos;appareil photo, la photothèque
          ou les fichiers du téléphone.
        </Text>

        <View className="gap-4">
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

          <Controller
            control={control}
            name="permitPhoto"
            render={({ field: { value, onChange } }) => (
              <DocumentUploadField
                label="Photo de permis (Recto)"
                value={value}
                onChange={onChange}
                uploading={uploadingField === "permitPhoto"}
                onPick={() => handlePickDocument("permitPhoto")}
              />
            )}
          />

          <Controller
            control={control}
            name="permitPhotoBack"
            render={({ field: { value, onChange } }) => (
              <DocumentUploadField
                label="Photo de permis (Verso)"
                value={value}
                onChange={onChange}
                uploading={uploadingField === "permitPhotoBack"}
                onPick={() => handlePickDocument("permitPhotoBack")}
              />
            )}
          />

          <Controller
            control={control}
            name="identityPhoto"
            render={({ field: { value, onChange } }) => (
              <DocumentUploadField
                label="Photo d'identité"
                value={value}
                onChange={onChange}
                uploading={uploadingField === "identityPhoto"}
                onPick={() => handlePickDocument("identityPhoto")}
              />
            )}
          />
        </View>
      </ScrollView>

      <View className="absolute right-0 bottom-0 left-0 px-5 pt-3 pb-5 bg-white border-t border-gray">
        <Button
          className="rounded-xl"
          onPress={onSubmit}
          disabled={!isDirty || updateMutation.isPending}
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
