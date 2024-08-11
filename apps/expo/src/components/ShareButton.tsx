import React from "react";
import { Share, TouchableOpacity } from "react-native";
import { ShareIcon } from "lucide-react-native";

interface ShareButtonProps {
  webPath: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ webPath }) => {
  const handleShare = async () => {
    const shareUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}${webPath}`;
    try {
      await Share.share({
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <TouchableOpacity onPress={handleShare}>
      <ShareIcon size={24} color="#5A32FB" />
    </TouchableOpacity>
  );
};

export default ShareButton;
