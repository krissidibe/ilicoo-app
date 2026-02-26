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
import { cn } from "@/src/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@react-navigation/elements";
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

const DEFAULT_OTP_CODE = "1234";
const OTP_DURATION_SECONDS = 30;

const signUpSchema = z.object({
  email: z.email({ message: "Email invalide" }),
  name: z.string().min(2, { message: "Le nom et prénom est requis" }).max(50, {
    message: "Le nom et prénom ne doit pas dépasser 50 caractères",
  }),
  phoneDialCode: z
    .string()
    .min(1, { message: "Le code de pays est requis" })
    .max(5, {
      message: "Le code pays est invalide",
    }),
  phoneNumber: z.string().regex(/^\d{8,15}$/, {
    message: "Le numéro de téléphone doit contenir entre 8 et 15 chiffres",
  }),
  gender: z.enum(["male", "female"], {
    message: "Le genre est requis",
  }),
});

type SignUpSchema = z.infer<typeof signUpSchema>;
type SignUpStep = "method" | "form" | "otp";
type SignUpMethod = "google" | "apple" | "email";

const SignUp = () => {
  const defaultCountry: CountryCode = useMemo(
    () =>
      countryCodes.find((country) => country.code === "FR") ?? countryCodes[0],
    [],
  );
  const countryCodeSheetRef = useRef<CountryCodeSheetRef>(null);
  const [step, setStep] = useState<SignUpStep>("method");
  const [method, setMethod] = useState<SignUpMethod | null>(null);
  const [otpValue, setOtpValue] = useState<string>("");
  const [otpTimer, setOtpTimer] = useState<number>(OTP_DURATION_SECONDS);
  const [otpMessage, setOtpMessage] = useState<string>("");
  const [selectedCountry, setSelectedCountry] =
    useState<CountryCode>(defaultCountry);
  const [submittedData, setSubmittedData] = useState<SignUpSchema | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      name: "",
      phoneDialCode: defaultCountry.dial,
      phoneNumber: "",
      gender: "male",
    },
  });

  useEffect(() => {
    if (step !== "otp" || otpTimer <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setOtpTimer((currentTimer) => Math.max(0, currentTimer - 1));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [step, otpTimer]);

  const onSubmit = (data: SignUpSchema): void => {
    setSubmittedData(data);
    setOtpMessage("");
    setOtpValue("");
    setOtpTimer(OTP_DURATION_SECONDS);
    setStep("otp");
  };

  const handleMethodSelection = (selectedMethod: SignUpMethod): void => {
    setMethod(selectedMethod);
    if (selectedMethod === "email") {
      setStep("form");
      return;
    } else {
      setValue("email", `test${Math.floor(Math.random() * 20) + 1}@test.com`);
      setStep("form");
    }
  };

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
    if (value !== "male" && value !== "female") {
      return;
    }
    setValue("gender", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    void trigger("gender");
  };

  const handleVerifyOtp = (): void => {
    if (otpTimer <= 0) {
      setOtpMessage("Le code a expiré. Renvoyez un code OTP.");
      return;
    }
    if (otpValue === DEFAULT_OTP_CODE) {
      setOtpMessage("OTP validé avec succès.");
      return;
    }
    setOtpMessage("Code OTP incorrect.");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-5 pb-8 bg-background pt-safe">
          <TouchableOpacity
            className="flex-row gap-2 items-center"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="black" />{" "}
            <Text className="text-base font-semibold">Retour</Text>
          </TouchableOpacity>
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="mt-0"
          >
            <Text variant="h2" className="mt-5 font-bold">
              Créer un compte
            </Text>
            <Text className="mt-4 text-base text-muted-foreground">
              Rejoignez notre communauté et commencez à partager vos trajets.
            </Text>
          </Animated.View>

          {step === "method" && (
            <Animated.View
              entering={FadeInDown.delay(240).springify()}
              className="gap-4 mt-8"
            >
              <Text className="text-base font-semibold">
                Étape 1/2 : choisissez votre type de compte
              </Text>
              <Button
                size="lg"
                variant="outline"
                className="justify-center mt-20 mb-3 w-full"
                onPress={() => handleMethodSelection("google")}
              >
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text className="text-base font-semibold">
                  Continuer avec Google
                </Text>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="justify-center mb-3 w-full bg-black"
                onPress={() => handleMethodSelection("apple")}
              >
                <Ionicons name="logo-apple" size={18} color="white" />
                <Text className="text-base font-semibold text-white">
                  Continuer avec Apple
                </Text>
              </Button>
              <Button
                size="lg"
                className="justify-center mb-3 w-full"
                onPress={() => handleMethodSelection("email")}
              >
                <Ionicons name="mail-outline" size={18} color="white" />
                <Text className="text-base font-semibold text-primary-foreground">
                  Continuer avec Email
                </Text>
              </Button>
              {otpMessage.length > 0 && method !== "email" && (
                <Text className="text-sm text-muted-foreground">
                  {otpMessage}
                </Text>
              )}
            </Animated.View>
          )}

          {step === "form" && (
            <Animated.View
              entering={FadeInDown.delay(260).springify()}
              className="gap-5 mt-6"
            >
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-base font-semibold">
                  Étape 2/2 : informations Email
                </Text>
                <TouchableOpacity onPress={() => setStep("method")}>
                  <Text className="text-sm text-primary">Changer de type</Text>
                </TouchableOpacity>
              </View>

              {method == "email" && (
                <View className="gap-2 items-start">
                  <Label className="text-base">Email</Label>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        value={value}
                        className={cn(
                          "focus:border-primary",
                          errors.email && "border-red-500",
                        )}
                      />
                    )}
                  />
                  {errors.email && (
                    <Text className="text-xs text-red-500">
                      {errors.email.message}
                    </Text>
                  )}
                </View>
              )}

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
                  <Text className="text-xs text-red-500">
                    {errors.name.message}
                  </Text>
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
                <Select className="w-full" onValueChange={handleGenderChange}>
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
              >
                <Text className="text-base font-bold text-primary-foreground">
                  Créer un compte
                </Text>
              </Button>
            </Animated.View>
          )}

          {step === "otp" && (
            <Animated.View
              entering={FadeInDown.delay(260).springify()}
              className="gap-4 p-4 mt-8 rounded-2xl border border-border"
            >
              <Text className="text-base font-semibold">Vérification OTP</Text>
              <Text className="text-sm text-muted-foreground">
                Un code OTP a été envoyé à {submittedData?.phoneDialCode}{" "}
                {submittedData?.phoneNumber}.
              </Text>

              <View className="gap-2 items-start">
                <Label className="text-base">Code OTP</Label>
                <Input
                  value={otpValue}
                  onChangeText={setOtpValue}
                  maxLength={4}
                  keyboardType="number-pad"
                  placeholder="Entrez le code OTP"
                  className="focus:border-primary"
                />
              </View>
              <Text
                className={cn(
                  "text-sm font-medium",
                  otpTimer === 0 ? "text-red-500" : "text-primary",
                )}
              >
                Temps restant : {otpTimer}s
              </Text>
              <View className="flex-row gap-3">
                <Button className="flex-1" onPress={handleVerifyOtp}>
                  <Text className="font-semibold text-primary-foreground">
                    Vérifier
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onPress={() => {
                    setOtpTimer(OTP_DURATION_SECONDS);
                    setOtpValue("");
                    setOtpMessage("");
                  }}
                >
                  <Text className="font-semibold">Renvoyer</Text>
                </Button>
              </View>
              {otpMessage.length > 0 && (
                <Text
                  className={cn(
                    "text-sm",
                    otpMessage.includes("succès")
                      ? "text-green-600"
                      : "text-red-500",
                  )}
                >
                  {otpMessage}
                </Text>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>
      <CountryCodeSheet
        ref={countryCodeSheetRef}
        onSelect={handleCountrySelect}
      />
    </KeyboardAvoidingView>
  );
};

export default SignUp;
