import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export function generatePublicId() {
  return nanoid();
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
    if (typeof value === "object" && value !== null) {
      // For objects, try to get constructor name or use toString
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const constructor = (value as Record<string, unknown>).constructor as
        | { name?: string }
        | undefined;
      if (constructor?.name && constructor.name !== "Object") {
        return `[${constructor.name} object]`;
      }
      // Use toString() which might be more informative than [object Object]
      try {
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
