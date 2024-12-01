import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Plus } from "lucide-react-native";

interface AddEventButtonProps {
  onPress: () => void;
}

const AddEventButton: React.FC<AddEventButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex-row items-center justify-center gap-2 rounded-full bg-interactive-2 p-4 shadow-lg"
    >
      <Plus size={24} color="#5A32FB" />
    </TouchableOpacity>
  );
};

export default AddEventButton;
