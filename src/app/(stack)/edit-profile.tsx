import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from "@/src/components/ui/select";
import { Text } from "@/src/components/ui/text";
import CountryCodeSheet, {
  type CountryCodeSheetRef,
} from "@/src/data/countryCodeSheet";
import { countryCodes, type CountryCode } from "@/src/data/countryCodes";
import HeaderApp from "@/src/components/Header/HeaderApp";
import { cn } from "@/src/lib/utils";
import { getUser, updateProfile, type UpdateProfilePayload } from "@/src/services/user.service";
import { queryKeys } from "@/src/services/queryKeys";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@react-navigation/elements";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { z } from "zod";

const editProfileSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Le nom et prénom est requis" })
    .max(50, {
      message: "Le nom et prénom ne doit pas dépasser 50 caractères",
    }),
  phoneDialCode: z
    .string()
    .min(1, { message: "Le code de pays est requis" })
    .max(5, { message: "Le code pays est invalide" }),
  phoneNumber: z.string().regex(/^\d{8,15}$/, {
    message: "Le numéro de téléphone doit contenir entre 8 et 15 chiffres",
  }),
  gender: z.enum(["male", "female"], { message: "Le genre est requis" }),
});

type EditProfileSchema = z.infer<typeof editProfileSchema>;

function genderToOption(gender: "male" | "female"): Option {
  return gender === "female"
    ? { value: "female", label: "Femme" }
    : { value: "male", label: "Homme" };
}

const EditProfileScreen = () => {
  const defaultCountry: CountryCode = useMemo(
    () =>
      countryCodes.find((country) => country.code === "FR") ?? countryCodes[0],
    [],
  );
  const countryCodeSheetRef = useRef<CountryCodeSheetRef>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryCode>(defaultCountry);
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery(getUser());

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    trigger,
    formState: { errors, isDirty },
  } = useForm<EditProfileSchema>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: "",
      phoneDialCode: defaultCountry.dial,
      phoneNumber: "",
      gender: "male",
    },
  });

  useEffect(() => {
    if (!user) return;
    const country =
      countryCodes.find((c) => c.code === user.country) ?? defaultCountry;
    setSelectedCountry(country);
    reset({
      name: user.name ?? "",
      phoneDialCode: country.dial,
      phoneNumber: user.phoneNumber ?? "",
      gender: (user.gender === "female" ? "female" : "male") as "male" | "female",
    });
  }, [user, defaultCountry.dial, reset]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      router.back();
    },
  });

  const handleCountrySelect = (country: CountryCode): void => {
    setSelectedCountry(country);
    setValue("phoneDialCode", country.dial, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  const handleGenderChange = (option: Option): void => {
    const value = option?.value;
    if (value !== "male" && value !== "female") return;
    setValue("gender", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    void trigger("gender");
  };

  const onSubmit = (data: EditProfileSchema): void => {
    mutation.mutate({
      name: data.name,
      phoneNumber: data.phoneNumber,
      phoneDialCode: data.phoneDialCode,
      country: selectedCountry.code,
      gender: data.gender,
    });
  };

  if (isLoading || !user) {
    return (
      <View className="flex-1 bg-background">
        <HeaderApp title="Modifier le profil" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted-foreground">Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Modifier le profil" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-8"
        >
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="gap-5 mt-6"
          >
            <View className="gap-2 items-start">
              <Label className="text-base">Email</Label>
              <Input
                value={user.email}
                editable={false}
                className="bg-muted/50 text-muted-foreground"
              />
              <Text className="text-xs text-muted-foreground">
                L&apos;email ne peut pas être modifié
              </Text>
            </View>

            <View className="gap-2 items-start">
              <Label className="text-base">Nom et prénom</Label>
              <Controller
                name="name"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Nom et prénom"
                    autoCapitalize="words"
                    autoComplete="name"
                    value={value}
                    className={cn(
                      "focus:border-primary",
                      errors.name && "border-red-500",
                    )}
                  />
                )}
              />
              {errors.name && (
                <Text className="text-xs text-red-500">{errors.name.message}</Text>
              )}
            </View>

            <View className="gap-2 items-start">
              <Label className="text-base">
                Numéro de téléphone WhatsApp
              </Label>
              <View className="flex-row gap-2">
                <Controller
                  name="phoneDialCode"
                  control={control}
                  render={({ field: { value } }) => (
                    <TouchableOpacity
                      onPress={() => countryCodeSheetRef.current?.open()}
                      activeOpacity={0.8}
                    >
                      <Input
                        onTouchStart={() =>
                          countryCodeSheetRef.current?.open()
                        }
                        value={`${selectedCountry.flag} ${value}`}
                        className={cn(
                          "w-[120px]",
                          errors.phoneDialCode && "border-red-500",
                        )}
                      />
                    </TouchableOpacity>
                  )}
                />
                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="Numéro de téléphone"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoComplete="tel"
                      autoCorrect={false}
                      value={value}
                      className={cn(
                        "flex-1 focus:border-primary",
                        errors.phoneNumber && "border-red-500",
                      )}
                    />
                  )}
                />
              </View>
              {errors.phoneDialCode && (
                <Text className="text-xs text-red-500">
                  {errors.phoneDialCode.message}
                </Text>
              )}
              {errors.phoneNumber && (
                <Text className="text-xs text-red-500">
                  {errors.phoneNumber.message}
                </Text>
              )}
            </View>

            <View className="gap-2 items-start">
              <Label className="text-base">Genre</Label>
              <Select
                className="w-full"
                value={genderToOption(watch("gender"))}
                onValueChange={handleGenderChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Votre genre" />
                </SelectTrigger>
                <SelectContent className="mt-2 w-[91%]">
                  <SelectItem label="Homme" value="male" />
                  <SelectItem label="Femme" value="female" />
                </SelectContent>
              </Select>
              {errors.gender && (
                <Text className="text-xs text-red-500">
                  {errors.gender.message}
                </Text>
              )}
            </View>

            <Button
              onPress={handleSubmit(onSubmit)}
              size="lg"
              className="mt-6 w-full"
              disabled={!isDirty || mutation.isPending}
            >
              <Text className="text-base font-bold text-primary-foreground">
                {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Text>
            </Button>
            {mutation.isError && (
              <Text className="text-sm text-red-500 text-center">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Erreur lors de la mise à jour"}
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CountryCodeSheet
        ref={countryCodeSheetRef}
        onSelect={handleCountrySelect}
      />
    </View>
  );
};

export default EditProfileScreen;
