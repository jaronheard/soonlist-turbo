import React from "react";
import { TouchableOpacity } from "react-native";
import { Plus } from "lucide-react-native";

interface AddEventButtonProps {
  onPress: () => void;
}

const AddEventButton: React.FC<AddEventButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-4 right-4 items-center justify-center rounded-full bg-interactive-2 p-4 shadow-lg"
    >
      <Plus size={24} color="#5A32FB" />
    </TouchableOpacity>
  );
};

export default AddEventButton;
