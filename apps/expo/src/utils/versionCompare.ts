/**
 * Compares two semantic version strings
 * @param version1 First version string (e.g., "1.2.8")
 * @param version2 Second version string (e.g., "1.2.9")
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(
  version1: string,
  version2: string,
): number {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  const maxLength = Math.max(v1Parts.length, v2Parts.length);

  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part < v2Part) {
      return -1;
    }
    if (v1Part > v2Part) {
      return 1;
    }
  }

  return 0;
}

/**
 * Checks if the current version is less than the minimum required version
 * @param currentVersion Current installed version
 * @param minimumVersion Minimum required version
 * @returns true if current version is behind minimum required version
 */
export function isVersionBehind(
  currentVersion: string,
  minimumVersion: string,
): boolean {
  return compareVersions(currentVersion, minimumVersion) < 0;
}

