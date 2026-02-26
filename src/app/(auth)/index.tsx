import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AuthIndex = () => {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const floatValue = useSharedValue(0);
  const sparkleRotate = useSharedValue(0);
  const [showSignInMethods, setShowSignInMethods] = useState<boolean>(false);

  useEffect(() => {
    // Animation du logo
    logoScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 100 }),
    );
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));

    // Animation de flottement
    floatValue.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
      true,
    );

    // Rotation sparkle
    sparkleRotate.value = withRepeat(
      withTiming(360, { duration: 4000 }),
      -1,
      false,
    );
  }, [floatValue, logoOpacity, logoScale, sparkleRotate]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { translateY: floatValue.value }],
    opacity: logoOpacity.value,
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSignInMethods(true);
  };

  const handleSignUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/sign-up");
  };

  const handleSignInMethod = (
    method: "google" | "apple" | "email" | "phone",
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/sign-in",
      params: { method },
    });
  };

  return (
    <View className="flex-1 bg-linear-to-b from-primary/5 to-background">
      <Image
        source={require("@/assets/app/images/fond.jpg")}
        style={{ height: "100%", width: "100%", resizeMode: "cover" }}
        className="absolute inset-0 blur-sm"
      />
      {/* Fond décoratif */}
      <View className="overflow-hidden absolute inset-0">
        <Animated.View
          entering={FadeIn.delay(500).duration(1000)}
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10"
        />
        <Animated.View
          entering={FadeIn.delay(700).duration(1000)}
          className="absolute -left-32 top-1/4 w-48 h-48 rounded-full bg-primary/5"
        />
      </View>

      {/* Logo animé */}
      <View className="flex-1 justify-start items-center px-10 p-safe">
        <Animated.View style={logoAnimatedStyle} className="items-center">
          <View className="relative">
            <Image
              source={require("@/assets/app/images/logo.png")}
              style={{ height: 140, width: 200, resizeMode: "contain" }}
            />
            <Animated.View
              style={sparkleAnimatedStyle}
              className="absolute -right-2 top-8"
            >
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </Animated.View>
          </View>
        </Animated.View>

        {/*    <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          className="items-center mt-6"
        >
          <Text className="text-lg text-center text-muted-foreground">
            Voyagez ensemble, économisez plus
          </Text>
        </Animated.View> */}
      </View>

      {/* Carte du bas */}
      <Animated.View
        entering={FadeInDown.delay(400).springify().damping(18).stiffness(100)}
        className="gap-5 p-8 pt-8 bg-card rounded-t-[32px] shadow-xl shadow-black/10 min-h-[330px]"
      >
        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <Text className="text-2xl font-bold text-foreground">
            {showSignInMethods
              ? "Choisissez un type de connexion"
              : "Commencez votre voyage"}
          </Text>
          {!showSignInMethods && (
            <Text className="mt-2 text-base text-muted-foreground">
              Déplacez-vous facilement, ensemble ou Trouvez un trajet sûr, près
              de chez vous ou Voyagez malin. Voyagez entre personnes de
              confiance.
            </Text>
          )}
        </Animated.View>

        {!showSignInMethods && (
          <Animated.View entering={FadeIn} className="gap-3">
            <Button size="lg" className="w-full" onPress={handleSignIn}>
              <Text className="text-base font-bold text-primary-foreground">
                Se connecter
              </Text>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onPress={handleSignUp}
            >
              <Text className="text-base font-bold">Créer un compte</Text>
            </Button>
          </Animated.View>
        )}

        {showSignInMethods && (
          <Animated.View entering={FadeIn} className="gap-5">
            <Button
              size="lg"
              variant="outline"
              className="justify-center w-full"
              onPress={() => handleSignInMethod("google")}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text className="text-base font-semibold">
                Se connecter avec Google
              </Text>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="justify-center w-full bg-black"
              onPress={() => handleSignInMethod("apple")}
            >
              <Ionicons name="logo-apple" size={18} color="white" />
              <Text className="text-base font-semibold text-white">
                Se connecter avec Apple
              </Text>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="justify-center w-full"
              onPress={() => handleSignInMethod("email")}
            >
              <Ionicons name="mail-outline" size={18} color="black" />
              <Text className="text-base font-semibold">
                Se connecter avec Email
              </Text>
            </Button>
            <Button
              size="lg"
              className="justify-center w-full"
              onPress={() => handleSignInMethod("phone")}
            >
              <Ionicons name="call-outline" size={18} color="white" />
              <Text className="text-base font-semibold text-primary-foreground">
                Se connecter avec Téléphone
              </Text>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="self-center px-0"
              onPress={() => setShowSignInMethods(false)}
            >
              <Text className="text-sm underline text-muted-foreground">
                Retour
              </Text>
            </Button>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeIn.delay(800).duration(400)}
          className="items-center"
        >
          <Text className="px-4 text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos conditions d&apos;utilisation et
            notre politique de confidentialité.
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default AuthIndex;
