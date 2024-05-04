import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export function generatePublicId() {
  return nanoid();
}

export function filterDuplicates<T extends { id: unknown }>(objects: T[]): T[] {
  return Array.from(new Map(objects.map((obj) => [obj.id, obj])).values());
}
