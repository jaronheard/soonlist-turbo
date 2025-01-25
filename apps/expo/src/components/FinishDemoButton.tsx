import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

export function FinishDemoButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/feed")}
      className="m-4 mb-8 rounded-full bg-interactive-1 px-6 py-3"
    >
      <Text className="text-center text-lg font-bold text-white">
        Finish Demo
      </Text>
    </Pressable>
  );
}
