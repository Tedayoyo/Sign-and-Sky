import { Tabs } from "expo-router/js-tabs";
import { Icon, type IconName } from "@/components/ui";
import { useApp } from "@/lib/app";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const c = useTheme();
  const { s, outbox } = useApp();
  const insets = useSafeAreaInsets();
  const icon = (name: IconName) => ({ focused }: { focused: boolean }) => <Icon name={name} color={focused ? c.primary : c.muted} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.line, height: 74 + insets.bottom, paddingTop: 6, paddingBottom: 8 + insets.bottom },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen name="index" options={{ title: s.tabs.ask, tabBarIcon: icon("ask") }} />
      <Tabs.Screen name="signs" options={{ title: s.tabs.signs, tabBarIcon: icon("signs") }} />
      <Tabs.Screen name="calendar" options={{ title: s.tabs.calendar, tabBarIcon: icon("calendar") }} />
      <Tabs.Screen name="share" options={{ title: s.tabs.share, tabBarIcon: icon("share"), tabBarBadge: outbox.length || undefined }} />
      <Tabs.Screen name="more" options={{ title: s.tabs.more, tabBarIcon: icon("more") }} />
    </Tabs>
  );
}
