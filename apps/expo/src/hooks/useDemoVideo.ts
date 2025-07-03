import { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export function useDemoVideo() {
  const [isLoading, setIsLoading] = useState(true);
  const videoUrl = useQuery(api.appConfig.getDemoVideoUrl);

  useEffect(() => {
    if (videoUrl) {
      setIsLoading(false);
    }
  }, [videoUrl]);

  return {
    videoUrl,
    isLoading,
  };
}
