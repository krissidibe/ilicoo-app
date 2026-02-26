import { useCallback, useEffect, useRef } from "react";

import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { View } from "react-native";
import { useBottomSheetStore } from "../../store/bottomSheet.store";

const AppBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { isOpen, content, snapPoints, close } = useBottomSheetStore();

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
      snapPoints={snapPoints}
      enablePanDownToClose
      index={-1}
      ref={bottomSheetRef}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView>
        <View>{content}</View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default AppBottomSheet;
