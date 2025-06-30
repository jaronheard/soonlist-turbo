import * as FileSystem from "expo-file-system";

const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}demo-videos/`;

interface CachedVideoInfo {
  uri: string;
  version: string;
  cachedAt: number;
}

class VideoCacheService {
  private cacheInfoKey = "demo-video-cache-info";

  async ensureCacheDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, {
        intermediates: true,
      });
    }
  }

  private getCacheFilePath(version: string): string {
    return `${VIDEO_CACHE_DIR}demo-v${version}.mp4`;
  }

  private async getCacheInfo(): Promise<CachedVideoInfo | null> {
    try {
      const cacheInfoPath = `${VIDEO_CACHE_DIR}${this.cacheInfoKey}.json`;
      const info = await FileSystem.getInfoAsync(cacheInfoPath);

      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(cacheInfoPath);
        return JSON.parse(content) as CachedVideoInfo;
      }
    } catch (error) {
      console.error("Error reading cache info:", error);
    }
    return null;
  }

  private async saveCacheInfo(info: CachedVideoInfo): Promise<void> {
    try {
      const cacheInfoPath = `${VIDEO_CACHE_DIR}${this.cacheInfoKey}.json`;
      await FileSystem.writeAsStringAsync(cacheInfoPath, JSON.stringify(info), {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error("Error saving cache info:", error);
    }
  }

  async getCachedVideo(version: string): Promise<string | null> {
    try {
      await this.ensureCacheDirectory();

      const cacheInfo = await this.getCacheInfo();
      if (!cacheInfo || cacheInfo.version !== version) {
        return null;
      }

      const filePath = this.getCacheFilePath(version);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        return filePath;
      }
    } catch (error) {
      console.error("Error checking cached video:", error);
    }
    return null;
  }

  async downloadVideo(
    url: string,
    version: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      await this.ensureCacheDirectory();

      // Clean up old versions first
      await this.cleanupOldVersions(version);

      const filePath = this.getCacheFilePath(version);

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        filePath,
        {},
        (downloadProgress) => {
          if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress =
              downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite;
            onProgress(Math.min(progress, 1));
          }
        },
      );

      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error("Download failed");
      }

      // Save cache info
      await this.saveCacheInfo({
        uri: filePath,
        version,
        cachedAt: Date.now(),
      });

      return filePath;
    } catch (error) {
      console.error("Error downloading video:", error);
      throw error;
    }
  }

  async cleanupOldVersions(currentVersion: string): Promise<void> {
    try {
      const cacheInfo = await this.getCacheInfo();
      if (cacheInfo && cacheInfo.version !== currentVersion) {
        // Delete old video file
        const oldFilePath = this.getCacheFilePath(cacheInfo.version);
        try {
          await FileSystem.deleteAsync(oldFilePath, { idempotent: true });
        } catch (error) {
          console.error("Error deleting old video:", error);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old versions:", error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(VIDEO_CACHE_DIR, { idempotent: true });
    } catch (error) {
      console.error("Error clearing video cache:", error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(VIDEO_CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(
          `${VIDEO_CACHE_DIR}${file}`,
        );
        if (fileInfo.exists && "size" in fileInfo) {
          totalSize += fileInfo.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Error calculating cache size:", error);
      return 0;
    }
  }

  // Helper to check if we should preload based on network conditions
  // This is just a placeholder - you might want to use a network info library
  shouldPreload(): boolean {
    // For now, always preload
    // In the future, you might want to check for WiFi connection
    return true;
  }
}

export const videoCache = new VideoCacheService();
