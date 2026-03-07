import HeaderApp from "@/src/components/Header/HeaderApp";
import { Text } from "@/src/components/ui/text";
import React from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const SECTIONS = [
  {
    title: "Collecte des données",
    content:
      "Ilicoo collecte les informations nécessaires au bon fonctionnement du service : nom, email, numéro de téléphone, données de localisation pour les trajets, et informations relatives aux véhicules. Ces données sont utilisées uniquement dans le cadre du service de covoiturage.",
  },
  {
    title: "Utilisation des données",
    content:
      "Vos données personnelles servent à gérer votre compte, à mettre en relation conducteurs et passagers, à traiter les réservations et les paiements, et à vous envoyer des notifications utiles (confirmations, rappels de trajet).",
  },
  {
    title: "Partage des données",
    content:
      "Nous ne vendons pas vos données. Les informations de contact (nom, téléphone) sont partagées uniquement avec les utilisateurs avec lesquels vous partagez un trajet, afin de faciliter la coordination.",
  },
  {
    title: "Sécurité",
    content:
      "Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, perte ou altération.",
  },
  {
    title: "Vos droits",
    content:
      "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Vous pouvez exercer ces droits en nous contactant à privacy@ilicoo.com.",
  },
];

const PrivacyScreen = () => {
  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Confidentialité" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text className="mb-4 text-base text-muted-foreground">
            Politique de confidentialité et protection de vos données
            personnelles.
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

export default PrivacyScreen;
