import { Text } from "@/src/components/ui/text";
import { countryCodes, type CountryCode } from "@/src/data/countryCodes";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { TouchableOpacity } from "react-native";

export interface CountryCodeSheetRef {
  open: () => void;
  close: () => void;
}

interface CountryCodeSheetProps {
  onSelect: (country: CountryCode) => void;
}

const CountryCodeSheet = forwardRef<CountryCodeSheetRef, CountryCodeSheetProps>(
  ({ onSelect }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [search, setSearch] = useState("");

    const snapPoints = useMemo(() => ["60%", "90%"], []);

    useImperativeHandle(ref, () => ({
      open: () => {
        setSearch("");
        bottomSheetRef.current?.snapToIndex(0);
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    const filteredCountries = useMemo(() => {
      if (!search.trim()) return countryCodes;
      const query = search.toLowerCase().trim();
      return countryCodes.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.dial.includes(query) ||
          c.code.toLowerCase().includes(query),
      );
    }, [search]);

    const handleSelect = useCallback(
      (country: CountryCode) => {
        onSelect(country);
        bottomSheetRef.current?.close();
      },
      [onSelect],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    const renderItem = useCallback(
      ({ item }: { item: CountryCode }) => (
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          className="flex-row gap-3 items-center px-5 py-3 active:bg-white/5"
        >
          <Text className="text-2xl">{item.flag}</Text>
          <Text className="flex-1 text-sm text-foreground">{item.name}</Text>
          <Text className="text-sm text-muted-foreground">{item.dial}</Text>
        </TouchableOpacity>
      ),
      [handleSelect],
    );

    const keyExtractor = useCallback((item: CountryCode) => item.code, []);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["90%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: "#ffffff50" }}
      >
        <BottomSheetView className="z-10 px-5 pt-5 pb-3">
          <BottomSheetTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher"
            placeholderTextColor="#00000050"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: "#E4E4E4",
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: "black",
              fontSize: 14,
              borderWidth: 1,
              borderColor: "#E4E4E4",
            }}
          />
        </BottomSheetView>

        <BottomSheetFlatList
          data={filteredCountries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 70 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </BottomSheet>
    );
  },
);

CountryCodeSheet.displayName = "CountryCodeSheet";

export default CountryCodeSheet;
