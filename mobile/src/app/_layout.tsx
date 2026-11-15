import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { NotoSansEthiopic_400Regular, NotoSansEthiopic_600SemiBold, NotoSansEthiopic_700Bold } from "@expo-google-fonts/noto-sans-ethiopic";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Welcome } from "@/components/Welcome";
import { AppProvider, useApp } from "@/lib/app";
import { setFontsReady } from "@/lib/type";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready, onboarded } = useApp();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  if (!onboarded) return <Welcome />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}

export default function RootLayout() {
  // If the fonts cannot be loaded the app still opens, with the phone's own fonts.
  const [loaded, error] = useFonts({ BricolageGrotesque_700Bold, NotoSansEthiopic_400Regular, NotoSansEthiopic_600SemiBold, NotoSansEthiopic_700Bold });
  if (!loaded && !error) return null;
  setFontsReady(loaded);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
