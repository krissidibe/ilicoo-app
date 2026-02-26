import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import CountryCodeSheet, {
  type CountryCodeSheetRef,
} from "@/src/data/countryCodeSheet";
import { countryCodes, type CountryCode } from "@/src/data/countryCodes";
import { cn } from "@/src/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@react-navigation/elements";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type SignInMethod = "google" | "apple" | "email" | "phone";
type PhoneStep = "input" | "otp";

const DEFAULT_OTP_CODE = "1234";
const OTP_DURATION_SECONDS = 30;

const SignIn = () => {
  const params = useLocalSearchParams<{ method?: string }>();
  const method = (params.method ?? "email") as SignInMethod;
  const defaultCountry: CountryCode = useMemo(
    () =>
      countryCodes.find((country) => country.code === "FR") ?? countryCodes[0],
    [],
  );
  const countryCodeSheetRef = useRef<CountryCodeSheetRef>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryCode>(defaultCountry);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");
  const [otpValue, setOtpValue] = useState<string>("");
  const [otpTimer, setOtpTimer] = useState<number>(OTP_DURATION_SECONDS);
  const [otpMessage, setOtpMessage] = useState<string>("");

  const isSocialMethod = method === "google" || method === "apple";
  const methodTitle =
    method === "google"
      ? "Google"
      : method === "apple"
        ? "Apple"
        : method === "phone"
          ? "Téléphone"
          : "Email";

  const handleCountrySelect = (country: CountryCode): void => {
    setSelectedCountry(country);
  };

  useEffect(() => {
    if (method !== "phone" || phoneStep !== "otp" || otpTimer <= 0) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setOtpTimer((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [method, otpTimer, phoneStep]);

  const handleStartOtp = (): void => {
    if (phone.trim().length < 8) {
      setOtpMessage("Numéro invalide. Entrez au moins 8 chiffres.");
      return;
    }
    setPhoneStep("otp");
    setOtpValue("");
    setOtpMessage("");
    setOtpTimer(OTP_DURATION_SECONDS);
  };

  const handleVerifyOtp = (): void => {
    if (otpTimer <= 0) {
      setOtpMessage("Le code a expiré. Veuillez renvoyer un OTP.");
      return;
    }
    if (otpValue === DEFAULT_OTP_CODE) {
      router.push("/(tabs)");
      setOtpMessage("OTP validé avec succès.");
      return;
    }
    setOtpMessage("Code OTP incorrect.");
  };

  const handleResendOtp = (): void => {
    setOtpValue("");
    setOtpTimer(OTP_DURATION_SECONDS);
    setOtpMessage("Un nouveau code OTP a été renvoyé.");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-5 pb-8 pt-safe">
          <TouchableOpacity
            className="flex-row gap-2 items-center"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="black" />
            <Text className="text-base font-semibold">Retour</Text>
          </TouchableOpacity>

          <Animated.View
            entering={FadeInDown.delay(180).springify()}
            className="mt-4"
          >
            <Text variant="h2" className="font-bold">
              Se connecter
            </Text>
            <Text className="mt-2 text-base text-muted-foreground">
              Veuillez entrer vos informations de connexion pour continuer.
            </Text>
          </Animated.View>

          {method === "email" && (
            <Animated.View
              entering={FadeInDown.delay(240).springify()}
              className="gap-5 mt-8"
            >
              <View className="gap-2 items-start">
                <Label className="text-base">Email</Label>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  className="focus:border-primary"
                />
              </View>
              <View className="gap-2 items-start">
                <Label className="text-base">Mot de passe</Label>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mot de passe"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="focus:border-primary"
                />
              </View>
              <Button size="lg" className="mt-2 w-full">
                <Text className="text-base font-bold text-primary-foreground">
                  Continuer
                </Text>
              </Button>
            </Animated.View>
          )}

          {method === "phone" && phoneStep === "input" && (
            <Animated.View
              entering={FadeInDown.delay(240).springify()}
              className="gap-5 mt-8"
            >
              <View className="gap-2 items-start">
                <Label className="text-base">Numéro de téléphone</Label>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => countryCodeSheetRef.current?.open()}
                  >
                    <Input
                      editable={false}
                      value={`${selectedCountry.flag} ${selectedCountry.dial}`}
                      className="w-[120px]"
                    />
                  </TouchableOpacity>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Numéro"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 focus:border-primary"
                  />
                </View>
              </View>
              <Button
                size="lg"
                className="mt-2 w-full"
                onPress={handleStartOtp}
              >
                <Text className="text-base font-bold text-primary-foreground">
                  Continuer avec OTP
                </Text>
              </Button>
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

          {method === "phone" && phoneStep === "otp" && (
            <Animated.View
              entering={FadeInDown.delay(240).springify()}
              className="gap-4 p-4 mt-8 rounded-2xl border border-border"
            >
              <Text className="text-base font-semibold">Vérification OTP</Text>
              <Text className="text-sm text-muted-foreground">
                Code envoyé au {selectedCountry.dial} {phone}
              </Text>

              <View className="gap-2 items-start">
                <Label className="text-base">Code OTP</Label>
                <Input
                  value={otpValue}
                  onChangeText={setOtpValue}
                  maxLength={4}
                  keyboardType="number-pad"
                  placeholder="Entrez 1234"
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
                  onPress={handleResendOtp}
                >
                  <Text className="font-semibold">Renvoyer</Text>
                </Button>
              </View>
              {otpMessage.length > 0 && (
                <Text
                  className={cn(
                    "text-sm",
                    otpMessage.includes("succès") ||
                      otpMessage.includes("renvoyé")
                      ? "text-green-600"
                      : "text-red-500",
                  )}
                >
                  {otpMessage}
                </Text>
              )}
              <Button
                variant="ghost"
                className="self-start px-0"
                onPress={() => {
                  setPhoneStep("input");
                  setOtpMessage("");
                }}
              >
                <Text className="text-sm text-muted-foreground">
                  Modifier le numéro
                </Text>
              </Button>
            </Animated.View>
          )}

          {isSocialMethod && (
            <Animated.View
              entering={FadeInDown.delay(240).springify()}
              className="gap-4 p-4 mt-8 rounded-2xl border border-border"
            >
              <Text className="text-base font-semibold">
                Connexion via {methodTitle}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Vous avez choisi {methodTitle}. Appuyez sur le bouton ci-dessous
                pour continuer l&apos;authentification.
              </Text>
              <Button
                size="lg"
                variant={method === "apple" ? "outline" : "default"}
                className={cn(
                  "w-full",
                  method === "apple" && "bg-black border-black",
                )}
              >
                <Ionicons
                  name={method === "apple" ? "logo-apple" : "logo-google"}
                  size={18}
                  color={method === "apple" ? "white" : "white"}
                />
                <Text className="text-base font-bold text-primary-foreground">
                  Continuer avec {methodTitle}
                </Text>
              </Button>
            </Animated.View>
          )}
        </View>
      </ScrollView>
      {method === "phone" && (
        <CountryCodeSheet
          ref={countryCodeSheetRef}
          onSelect={handleCountrySelect}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default SignIn;
