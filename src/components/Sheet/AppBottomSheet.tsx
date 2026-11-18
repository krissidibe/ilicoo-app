import { useCallback, useEffect, useRef } from "react";

import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetStore } from "../../store/bottomSheet.store";

const AppBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { isOpen, content, snapPoints, scrollable, close } =
    useBottomSheetStore();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** snapPoints vide → la feuille prend la hauteur de son contenu (adaptée à l'écran). */
  const fitToContent = snapPoints.length === 0;

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        close();
      }
    },
    [close],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  return (
    <BottomSheet
      snapPoints={fitToContent ? undefined : snapPoints}
      enableDynamicSizing={fitToContent ? true : undefined}
      maxDynamicContentSize={
        fitToContent ? windowHeight - insets.top - 24 : undefined
      }
      enablePanDownToClose
      index={-1}
      ref={bottomSheetRef}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
    >
      {scrollable ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          {content}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView
          style={
            fitToContent ? { paddingBottom: insets.bottom } : { flex: 1 }
          }
        >
          {content}
        </BottomSheetView>
      )}
    </BottomSheet>
  );
};

export default AppBottomSheet;
