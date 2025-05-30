import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export function generatePublicId() {
  return nanoid();
}

export function generateNumericId(): number {
  // Use a base timestamp relative to a more recent epoch to reduce digits
  // Using Jan 1, 2024 as base: 1704067200000
  const baseEpoch = 1704067200000;
  const relativeTimestamp = Date.now() - baseEpoch;

  // Add cryptographically secure random digits for additional entropy
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomPart = randomArray[0] % 1000; // Get last 3 digits (0-999)

  // Combine relative timestamp with random part
  // This creates a smaller number that stays within safe integer range
  const result = relativeTimestamp * 1000 + randomPart;

  // Ensure we don't exceed MAX_SAFE_INTEGER
  if (result > Number.MAX_SAFE_INTEGER) {
    throw new Error("Generated ID would exceed safe integer range");
  }

  return result;
}

export function missingEnvVariableUrl(envVarName: string, whereToGet: string) {
  const deployment = deploymentName();
  if (!deployment) return `Missing ${envVarName} in environment variables.`;
  return (
    `\n  Missing ${envVarName} in environment variables.\n\n` +
    `  Get it from ${whereToGet} .\n  Paste it on the Convex dashboard:\n` +
    `  https://dashboard.convex.dev/d/${deployment}/settings?var=${envVarName}`
  );
}

export function deploymentName() {
  const url = process.env.CONVEX_CLOUD_URL;
  if (!url) return undefined;
  const regex = new RegExp("https://(.+).convex.cloud");
  return regex.exec(url)?.[1];
}

/**
 * Safely converts an unknown value to a string for error logging
 */
export function safeStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  try {
    return JSON.stringify(value);
  } catch {
    // If JSON.stringify fails, try to get a meaningful string representation
    if (typeof value === "object") {
      // For objects, try to get constructor name or use toString
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const objectConstructor = (value as Record<string, unknown>)
        .constructor as { name?: string } | undefined;
      if (objectConstructor?.name && objectConstructor.name !== "Object") {
        return `[${objectConstructor.name} object]`;
      }
      // Use toString() which might be more informative than [object Object]
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const stringValue = (value as { toString?: () => string }).toString?.();
        return stringValue && stringValue !== "[object Object]"
          ? stringValue
          : "[object Object]";
      } catch {
        return "[object Object]";
      }
    }
    // For primitives that failed JSON.stringify, just return their type
    return `[${typeof value}]`;
  }
}

export function generateNotificationId() {
  return `not_${generatePublicId()}`;
}
