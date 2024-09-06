import React from "react";
import { Share, TouchableOpacity } from "react-native";
import { ShareIcon } from "lucide-react-native";

import Config from "~/utils/config";

interface ShareButtonProps {
  webPath: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ webPath }) => {
  const handleShare = async () => {
    const shareUrl = `${Config.apiBaseUrl}${webPath}`;
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
      <ShareIcon size={24} color="#FFF" />
    </TouchableOpacity>
  );
};

export default ShareButton;
