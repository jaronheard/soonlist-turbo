import { Text, View } from "react-native";

import { EyeOff } from "~/components/icons";
import { cn } from "~/utils/cn";

export function PrivateVisibilityBadge({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-1 rounded-full bg-neutral-4/70 px-2 py-0.5",
        className,
      )}
    >
      <EyeOff size={12} color="#627496" />
      <Text className="text-xs font-medium text-neutral-2">Private</Text>
    </View>
  );
}
