import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Registra o device p/ push (Expo Notifications). O token deve ser enviado ao backend
// (endpoint a criar: POST /api/push/register) p/ o hub disparar avisos/atualização.
export async function registerForPush(): Promise<string | null> {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Avisos",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}
