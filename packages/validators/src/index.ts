import { z } from "zod";

export const userAdditionalInfoSchema = z.object({
  bio: z.string().max(150, "Bio must be 150 characters or less").optional(),
  publicEmail: z.string().email("Enter a valid email address").optional(),
  publicPhone: z
    .string()
    .max(20, "Phone number must be 20 digits or less")
    .optional(),
  publicInsta: z
    .string()
    .max(31, "Instagram username must be 31 characters or less")
    .optional(),
  publicWebsite: z
    .string()
    .max(1083, "Website url must be 2083 characters or less")
    .optional(),
});
