import { useCallback, useEffect, useRef } from "react";

import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetStore } from "../../store/bottomSheet.store";

const AppBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { isOpen, content, snapPoints, close } = useBottomSheetStore();
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
      <BottomSheetView
        style={fitToContent ? { paddingBottom: insets.bottom } : undefined}
      >
        <View>{content}</View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default AppBottomSheet;
