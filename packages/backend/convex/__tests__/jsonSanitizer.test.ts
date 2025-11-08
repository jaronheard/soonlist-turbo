import { describe, expect, it } from "vitest";

import { extractJsonFromText } from "../model/aiHelpers";

describe("extractJsonFromText", () => {
  it("should extract JSON from markdown code fences with json tag", () => {
    const input = '```json\n{\n  "name": "Jesse Kamerzell Art Exhibition",\n  "description": "An exhibition of new work by artist Jesse Kamerzell.",\n  "startDate": "2025-11-09",\n  "startTime": "12:00:00",\n  "endDate": "2025-11-09",\n  "endTime": "15:00:00",\n  "timeZone": "America/Los_Angeles",\n  "location": "2502 SE Belmont St. Portland, OR"\n}\n```';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.name).toBe("Jesse Kamerzell Art Exhibition");
    expect(parsed.startDate).toBe("2025-11-09");
  });

  it("should extract JSON from markdown code fences without json tag", () => {
    const input = '```\n{\n  "name": "INDIAN DESTROYS THE CUPBOARD",\n  "description": "An all-Indigenous drag show",\n  "startDate": "2025-11-08",\n  "startTime": "17:00:00",\n  "endDate": "2025-11-08",\n  "endTime": "21:00:00",\n  "timeZone": "America/Los_Angeles",\n  "location": "Understory, Oakland, Ohlone Land"\n}\n```';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.name).toBe("INDIAN DESTROYS THE CUPBOARD");
    expect(parsed.location).toBe("Understory, Oakland, Ohlone Land");
  });

  it("should extract JSON from text with extra content before and after", () => {
    const input =
      'Some text before\n```json\n{\n  "name": "Album Listening Party",\n  "description": "An album listening party for Dokhtar Bandari by DJ Ari B.",\n  "startDate": "2025-11-09",\n  "startTime": "19:00:00",\n  "endDate": "2025-11-09",\n  "endTime": "20:30:00",\n  "timeZone": "America/Los_Angeles",\n  "location": "Cone Shape Top 4124 Broadway, Oakland"\n}\n```\nSome text after';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.name).toBe("Album Listening Party");
    expect(parsed.startTime).toBe("19:00:00");
  });

  it("should extract JSON object from plain text without fences", () => {
    const input =
      '{\n  "name": "Test Event",\n  "startDate": "2025-11-09",\n  "startTime": "12:00:00",\n  "endDate": "2025-11-09",\n  "endTime": "15:00:00",\n  "timeZone": "America/Los_Angeles",\n  "location": "Test Location"\n}';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.name).toBe("Test Event");
  });

  it("should extract JSON array from text", () => {
    const input = '```json\n[\n  { "id": 1, "name": "Item 1" },\n  { "id": 2, "name": "Item 2" }\n]\n```';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
  });

  it("should handle JSON with escaped quotes in strings", () => {
    const input =
      '```json\n{\n  "description": "An event with \\"quotes\\" in the description",\n  "name": "Test"\n}\n```';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.description).toBe('An event with "quotes" in the description');
  });

  it("should return null for empty text", () => {
    const result = extractJsonFromText("");
    expect(result).toBeNull();
  });

  it("should return null for text without JSON", () => {
    const result = extractJsonFromText("This is just plain text without any JSON");
    expect(result).toBeNull();
  });

  it("should handle JSON with nested objects", () => {
    const input =
      '```json\n{\n  "name": "Event",\n  "metadata": {\n    "platform": "instagram",\n    "mentions": ["user1", "user2"]\n  }\n}\n```';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.metadata.platform).toBe("instagram");
    expect(parsed.metadata.mentions).toEqual(["user1", "user2"]);
  });

  it("should handle case-insensitive code fence detection", () => {
    const input = '```JSON\n{\n  "name": "Test Event"\n}\n```';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.name).toBe("Test Event");
  });

  it("should extract first JSON object when multiple objects exist", () => {
    const input =
      'First: {"name": "First Event"} Second: {"name": "Second Event"}';
    const result = extractJsonFromText(input);
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result!);
    expect(parsed.name).toBe("First Event");
  });
});


