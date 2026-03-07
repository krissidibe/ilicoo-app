import HeaderApp from "@/src/components/Header/HeaderApp";
import { Text } from "@/src/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const FAQ_ITEMS = [
  {
    q: "Comment réserver une place ?",
    a: "Recherchez un trajet, sélectionnez le nombre de places souhaitées, puis validez votre réservation. Le chauffeur recevra une notification et confirmera ou refusera votre demande.",
  },
  {
    q: "Comment publier un trajet ?",
    a: "Allez dans « Nouveau trajet », choisissez votre véhicule, définissez l'itinéraire (départ/arrivée), la date/heure et le nombre de places. Le prix estimé s'affiche automatiquement par place.",
  },
  {
    q: "Comment modifier ou annuler une réservation ?",
    a: "Dans « Mes trajets » ou « Trajets récents », ouvrez le détail de votre réservation. Vous pouvez annuler tant que le chauffeur n'a pas confirmé.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Envoyez-nous un email à support@ilicoo.com ou utilisez le formulaire sur notre site. Nous répondons sous 24 à 48 heures.",
  },
];

const HelpCenterScreen = () => {
  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Centre d'aide" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text className="mb-4 text-base text-muted-foreground">
            Trouvez des réponses aux questions les plus fréquentes et contactez
            notre équipe si besoin.
          </Text>
        </Animated.View>

        {FAQ_ITEMS.map((item, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(50 * (i + 1)).duration(350)}
            className="p-4 mb-3 rounded-2xl border border-gray-200/80 bg-white"
          >
            <Text className="font-semibold text-foreground">{item.q}</Text>
            <Text className="mt-2 text-sm text-muted-foreground">{item.a}</Text>
          </Animated.View>
        ))}

        <Animated.View
          entering={FadeInDown.delay(300).duration(350)}
          className="mt-6 p-4 rounded-2xl border border-primary/20 bg-primary/5"
        >
          <Text className="mb-3 font-semibold text-foreground">
            Besoin d'aide ?
          </Text>
          <Text className="mb-4 text-sm text-muted-foreground">
            Notre équipe est disponible pour vous accompagner.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:support@ilicoo.com")}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="mail-outline" size={20} color="#6366f1" />
            <Text className="font-medium text-primary">
              support@ilicoo.com
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default HelpCenterScreen;
