/**
 * Web stub: react-native-maps uses native codegen and cannot run on react-native-web.
 * Metro resolves `react-native-maps` to this file when platform === "web".
 */
import React from "react";
import { View, type ViewProps } from "react-native";

export const PROVIDER_GOOGLE = "google";

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type MapPressEvent = {
  nativeEvent: {
    coordinate: LatLng;
  };
};

type MapViewProps = ViewProps & {
  initialRegion?: unknown;
  provider?: string;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  onPress?: (event: MapPressEvent) => void;
};

const MapView = React.forwardRef<View, MapViewProps>(function MapViewStub(
  { children, style, ...rest },
  ref,
) {
  return (
    <View ref={ref} style={style} {...rest}>
      {children}
    </View>
  );
});

export default MapView;

export function Marker(_props: ViewProps) {
  return null;
}

export function Polyline(_props: ViewProps) {
  return null;
}
