import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export function generatePublicId() {
  return nanoid();
}

export function generateNumericId(): number {
  const baseEpoch = 1704067200000;
  const relativeTimestamp = Date.now() - baseEpoch;

  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-non-null-assertion
  const randomPart = randomArray[0]! % 1000;

  const result = relativeTimestamp * 1000 + randomPart;

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

export function safeStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  try {
    return JSON.stringify(value);
  } catch {
    if (typeof value === "object") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const objectConstructor = (value as Record<string, unknown>)
        .constructor as { name?: string } | undefined;
      if (objectConstructor?.name && objectConstructor.name !== "Object") {
        return `[${objectConstructor.name} object]`;
      }
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
    return `[${typeof value}]`;
  }
}

export function generateNotificationId() {
  return `not_${generatePublicId()}`;
}
