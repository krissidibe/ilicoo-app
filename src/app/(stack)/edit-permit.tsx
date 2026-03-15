import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { getUser, updateProfile } from "@/src/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from "react-native";

type PermitFormValues = {
  permitNumber: string;
  permitPhoto: string;
  permitPhotoBack: string;
  identityPhoto: string;
};

const EditPermitScreen = () => {
  const { data: user, isLoading } = useQuery(getUser());
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
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

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      Alert.alert("Succès", "Vos informations de permis ont été mises à jour.");
      router.back();
    },
    onError: (error) => {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Erreur lors de la mise à jour");
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
          <Text className="text-lg font-bold text-white">Mon permis</Text>
          <View className="w-6" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-sm text-muted-foreground">
          Renseignez vos informations de permis de conduire
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
              <View>
                <Text className="mb-1 text-xs text-muted-foreground">
                  Photo de permis (Recto)
                </Text>
                <TouchableOpacity
                  className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                  onPress={() => {
                    if (value) onChange("");
                    else onChange("permis_photo_01.jpg");
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        value
                          ? "checkmark-circle-outline"
                          : "cloud-upload-outline"
                      }
                      size={18}
                      color={value ? "#10b981" : "#6366f1"}
                    />
                    <Text className="ml-2 text-sm">
                      {value ? value : "Uploader votre photo"}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-primary">
                    {value ? "Retirer" : "Uploader"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <Controller
            control={control}
            name="permitPhotoBack"
            render={({ field: { value, onChange } }) => (
              <View>
                <Text className="mb-1 text-xs text-muted-foreground">
                  Photo de permis (Verso)
                </Text>
                <TouchableOpacity
                  className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                  onPress={() => {
                    if (value) onChange("");
                    else onChange("permis_verso_01.jpg");
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        value
                          ? "checkmark-circle-outline"
                          : "cloud-upload-outline"
                      }
                      size={18}
                      color={value ? "#10b981" : "#6366f1"}
                    />
                    <Text className="ml-2 text-sm">
                      {value ? value : "Uploader votre photo"}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-primary">
                    {value ? "Retirer" : "Uploader"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <Controller
            control={control}
            name="identityPhoto"
            render={({ field: { value, onChange } }) => (
              <View>
                <Text className="mb-1 text-xs text-muted-foreground">
                  Photo d'identité
                </Text>
                <TouchableOpacity
                  className="flex-row justify-between items-center p-4 rounded-xl border border-dashed border-gray"
                  onPress={() => {
                    if (value) onChange("");
                    else onChange("identity_photo_01.jpg");
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        value
                          ? "checkmark-circle-outline"
                          : "cloud-upload-outline"
                      }
                      size={18}
                      color={value ? "#10b981" : "#6366f1"}
                    />
                    <Text className="ml-2 text-sm">
                      {value ? value : "Uploader votre photo"}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-primary">
                    {value ? "Retirer" : "Uploader"}
                  </Text>
                </TouchableOpacity>
              </View>
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
