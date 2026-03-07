import HeaderApp from "@/src/components/Header/HeaderApp";
import { Text } from "@/src/components/ui/text";
import React from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const SECTIONS = [
  {
    title: "Objet",
    content:
      "Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de l'application Ilicoo, service de covoiturage mettant en relation conducteurs et passagers.",
  },
  {
    title: "Acceptation",
    content:
      "En créant un compte et en utilisant Ilicoo, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser l'application.",
  },
  {
    title: "Utilisation du service",
    content:
      "Ilicoo est une plateforme de mise en relation. Les conducteurs s'engagent à respecter le code de la route et à disposer des documents requis (permis, assurance). Les passagers s'engagent à respecter les règles de civilité et de sécurité.",
  },
  {
    title: "Réservations et annulations",
    content:
      "Les réservations sont confirmées une fois acceptées par le conducteur. Les annulations sont soumises aux règles définies dans l'application. En cas de non-respect répété, le compte peut être suspendu.",
  },
  {
    title: "Responsabilité",
    content:
      "Ilicoo n'est pas partie prenante des trajets. La responsabilité des conducteurs et passagers reste engagée dans le cadre de leurs obligations légales. Ilicoo ne peut être tenu responsable des dommages survenus pendant un trajet.",
  },
  {
    title: "Modifications",
    content:
      "Ilicoo se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés des changements importants. La poursuite de l'utilisation après modification vaut acceptation.",
  },
];

const TermsScreen = () => {
  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Conditions d'utilisation" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text className="mb-4 text-base text-muted-foreground">
            Règles et informations légales régissant l'utilisation d'Ilicoo.
          </Text>
        </Animated.View>

        {SECTIONS.map((section, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(50 * (i + 1)).duration(350)}
            className="mb-6"
          >
            <Text className="mb-2 font-semibold text-foreground">
              {section.title}
            </Text>
            <Text className="text-sm text-muted-foreground leading-6">
              {section.content}
            </Text>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

export default TermsScreen;
