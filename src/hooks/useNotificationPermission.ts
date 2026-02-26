import { useEffect, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

export interface NotificationPermissionState {
  status: "undetermined" | "granted" | "denied";
  isLoading: boolean;
  canAskAgain: boolean;
}

/**
 * Hook pour gérer les permissions de notification
 * 
 * Note: Sur simulateur iOS/Android, les notifications peuvent ne pas fonctionner
 * correctement. Ce hook gère ce cas en simulant les permissions.
 */
export const useNotificationPermission = () => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    status: "undetermined",
    isLoading: true,
    canAskAgain: true,
  });

  const isSimulator = Constants.isDevice === false;

  const checkPermission = useCallback(async () => {
    try {
      // Sur simulateur, on simule les permissions
      if (isSimulator) {
        setPermissionState({
          status: "granted", // Simuler accordé sur simulateur
          isLoading: false,
          canAskAgain: true,
        });
        return;
      }

      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      
      setPermissionState({
        status: status as "undetermined" | "granted" | "denied",
        isLoading: false,
        canAskAgain: canAskAgain ?? true,
      });
    } catch (error) {
      console.error("Error checking notification permission:", error);
      setPermissionState({
        status: "undetermined",
        isLoading: false,
        canAskAgain: true,
      });
    }
  }, [isSimulator]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Sur simulateur, simuler l'acceptation
      if (isSimulator) {
        setPermissionState({
          status: "granted",
          isLoading: false,
          canAskAgain: true,
        });
        return true;
      }

      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      
      setPermissionState({
        status: status as "undetermined" | "granted" | "denied",
        isLoading: false,
        canAskAgain: canAskAgain ?? true,
      });

      return status === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSimulator]);

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    try {
      // Sur simulateur, retourner un token fictif
      if (isSimulator) {
        console.log("Running on simulator - using mock push token");
        return "SIMULATOR_MOCK_TOKEN";
      }

      // Vérifier les permissions d'abord
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Push notification permission not granted");
        return null;
      }

      // Configurer le canal de notification pour Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      // Obtenir le token de push
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token.data;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }, [isSimulator]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...permissionState,
    isSimulator,
    checkPermission,
    requestPermission,
    registerForPushNotifications,
  };
};

// Configuration des handlers de notification
export const configureNotificationHandlers = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};
