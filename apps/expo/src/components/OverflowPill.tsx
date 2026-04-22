import { Pressable, Text, View } from "react-native";

const HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 } as const;

export function OverflowPill({
  count,
  onPress,
  className,
}: {
  count: number;
  onPress?: () => void;
  className?: string;
}) {
  if (count <= 0) return null;
  const pillClass = `rounded-full bg-interactive-3 px-1.5 py-0.5${
    className ? ` ${className}` : ""
  }`;
  const text = (
    <Text className="text-xs font-medium text-interactive-1">+{count}</Text>
  );
  if (!onPress) {
    return <View className={pillClass}>{text}</View>;
  }
  return (
    <Pressable className={pillClass} onPress={onPress} hitSlop={HIT_SLOP}>
      {text}
    </Pressable>
  );
}
