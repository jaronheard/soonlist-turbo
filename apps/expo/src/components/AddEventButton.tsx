import React from "react";
import { TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Plus } from "lucide-react-native";

interface AddEventButtonProps {
  onPress: () => void;
}

const AddEventButton: React.FC<AddEventButtonProps> = ({ onPress }) => {
  return (
    <View className="absolute bottom-0 left-0 right-0">
      {/* Blur background with gradient mask */}
      <View className="absolute bottom-0 h-32 w-full overflow-hidden">
        <LinearGradient
          colors={["transparent", "white"]}
          locations={[0, 0.5]}
          className="absolute h-full w-full"
        />
        <BlurView intensity={30} className="h-full w-full" tint="light" />
      </View>

      {/* Button */}
      <TouchableOpacity
        onPress={onPress}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center gap-2 rounded-full bg-interactive-2 p-6 shadow-lg"
      >
        <Plus size={28} color="#5A32FB" />
      </TouchableOpacity>
    </View>
  );
};

export default AddEventButton;
