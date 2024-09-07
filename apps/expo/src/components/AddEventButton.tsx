import React from "react";
import { Pressable, Text } from "react-native";

interface AddEventButtonProps {
  onPress: () => void;
}

const AddEventButton: React.FC<AddEventButtonProps> = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-4 right-4 rounded-full bg-blue-500 p-4"
    >
      <Text className="font-bold text-white">Add Event</Text>
    </Pressable>
  );
};

export default AddEventButton;
