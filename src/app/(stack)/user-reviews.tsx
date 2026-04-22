import HeaderApp from "@/src/components/Header/HeaderApp";
import StarRating from "@/src/components/StarRating";
import { Text } from "@/src/components/ui/text";
import { VerifiedBadge } from "@/src/components/VerifiedBadge";
import { getUserRatingsPage } from "@/src/services/rating.service";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";

type ReviewItem = {
  id: string;
  stars: number;
  comment?: string | null;
  createdAt: string;
  fromUser?: {
    id: string;
    name: string;
    image: string | null;
    isVerified?: boolean;
  };
};

const PAGE_SIZE = 10;

const UserReviewsScreen = () => {
  const params = useLocalSearchParams<{ userId?: string; name?: string }>();
  const userId = String(params.userId ?? "");
  const titleName = params.name ? String(params.name) : "Utilisateur";

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["ratings", "user-reviews", userId],
      enabled: Boolean(userId),
      initialPageParam: 1,
      queryFn: ({ pageParam }) =>
        getUserRatingsPage(userId, Number(pageParam), PAGE_SIZE),
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.page + 1 : undefined,
    });

  const pages = data?.pages ?? [];
  const first = pages[0];
  const reviews: ReviewItem[] = pages.flatMap((p) => p.ratings);

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Avis utilisateur" />
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
          ListHeaderComponent={
            <View className="p-4 mb-3 bg-white rounded-2xl border border-gray-200">
              <Text className="text-sm text-muted-foreground">Profil</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Text className="text-lg font-bold text-foreground">
                  {first?.profileUser?.name ?? titleName}
                </Text>
                {first?.profileUser?.isVerified ? (
                  <VerifiedBadge size={20} className="shrink-0" />
                ) : null}
              </View>
              <View className="flex-row gap-2 items-center mt-2">
                <StarRating
                  rating={Math.round(first?.averageRating ?? 0)}
                  size={16}
                  editable={false}
                />
                <Text className="text-sm text-muted-foreground">
                  {(first?.averageRating ?? 0).toFixed(1)} ({first?.totalRatings ?? 0}{" "}
                  avis)
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View className="p-4 bg-white rounded-2xl border border-gray-200">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {item.fromUser?.name ?? "Utilisateur"}
                  </Text>
                  {item.fromUser?.isVerified ? (
                    <VerifiedBadge size={15} className="shrink-0" />
                  ) : null}
                </View>
                <Text className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <View className="mt-2">
                <StarRating rating={item.stars} size={18} editable={false} />
              </View>
              {item.comment ? (
                <Text className="mt-2 text-sm text-foreground">{item.comment}</Text>
              ) : (
                <Text className="mt-2 text-sm italic text-muted-foreground">
                  Aucun commentaire
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="py-16">
              <Text className="text-center text-muted-foreground">
                Aucun avis pour le moment.
              </Text>
            </View>
          }
          ListFooterComponent={
            hasNextPage ? (
              <TouchableOpacity
                className="items-center py-3 mt-2 rounded-xl border border-gray-300"
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <Text className="font-semibold text-foreground">
                  {isFetchingNextPage ? "Chargement..." : "Voir plus d'avis"}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default UserReviewsScreen;
