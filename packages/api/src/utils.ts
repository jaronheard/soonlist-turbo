import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export function generatePublicId() {
  return nanoid();
}

export function filterDuplicates<T extends { id: unknown }>(objects: T[]): T[] {
  return Array.from(
    new Map(
      objects
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        .filter((obj): obj is T => obj !== null && obj !== undefined)
        .map((obj) => [obj.id, obj]),
    ).values(),
  );
}
