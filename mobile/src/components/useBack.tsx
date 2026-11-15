import { router } from "expo-router";
import { BackButton } from "@/components/Screen";
import { useApp } from "@/lib/app";

/** The back button for pages opened from Explore. */
export function useBack() {
  const { d } = useApp();
  return <BackButton label={d.common.back} onPress={() => (router.canGoBack() ? router.back() : router.replace("/more"))} />;
}
