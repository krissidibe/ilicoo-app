import { useCallback, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export const useGooglePlaces = (
  countryCode = "ml",
) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = useCallback(
    (input: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!input || input.length < 2) {
        setPredictions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams({
            input,
            key: GOOGLE_MAPS_API_KEY,
            components: `country:${countryCode}`,
            language: "fr",
            types: "geocode|establishment",
          });

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
          );
          const data = await response.json();

          if (data.status === "OK" && data.predictions) {
            setPredictions(data.predictions);
          } else {
            setPredictions([]);
          }
        } catch {
          setPredictions([]);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    },
    [countryCode],
  );

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      try {
        const params = new URLSearchParams({
          place_id: placeId,
          key: GOOGLE_MAPS_API_KEY,
          fields: "name,formatted_address,geometry",
          language: "fr",
        });

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
        );
        const data = await response.json();

        if (data.status === "OK" && data.result) {
          return data.result as PlaceDetails;
        }
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  const clearPredictions = useCallback(() => {
    setPredictions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return {
    predictions,
    isSearching,
    searchPlaces,
    getPlaceDetails,
    clearPredictions,
  };
};
