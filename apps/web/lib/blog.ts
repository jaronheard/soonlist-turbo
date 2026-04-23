import "server-only";

import fs from "fs";
import path from "path";
import { cache } from "react";
import matter from "gray-matter";
import { z } from "zod";

const blogDirectory = path.join(process.cwd(), "content", "blog");

const frontmatterSchema = z.object({
  title: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  author: z.string(),
  authorImage: z
    .string()
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//.test(value),
      "authorImage must be a root-relative path or absolute http(s) URL",
    )
    .optional(),
  tags: z.array(z.string()),
  excerpt: z.string(),
  coverImage: z
    .string()
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//.test(value),
      "coverImage must be a root-relative path or absolute http(s) URL",
    )
    .optional(),
  published: z.boolean(),
});

export type BlogFrontmatter = z.infer<typeof frontmatterSchema>;

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
}

interface BlogPostWithContent extends BlogPost {
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  const files = fs.readdirSync(blogDirectory).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        console.warn(`Skipping file with invalid slug: ${filename}`);
        return null;
      }
      const filePath = path.join(blogDirectory, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents) as { data: unknown };
      const parsed = frontmatterSchema.safeParse(data);

      if (!parsed.success) {
        console.warn(`Invalid frontmatter in ${filename}:`, parsed.error);
        return null;
      }

      return { slug, frontmatter: parsed.data };
    })
    .filter((post): post is BlogPost => post !== null);

  const published =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? posts.filter((p) => p.frontmatter.published)
      : posts;

  return published.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );
}

const getPostBySlugUncached = (slug: string): BlogPostWithContent | null => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const filePath = path.join(blogDirectory, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents) as {
    data: unknown;
    content: string;
  };
  const parsed = frontmatterSchema.safeParse(data);

  if (!parsed.success) {
    console.warn(`Invalid frontmatter in ${slug}.mdx:`, parsed.error);
    return null;
  }

  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" &&
    !parsed.data.published
  ) {
    return null;
  }

  return { slug, frontmatter: parsed.data, content };
};

export const getPostBySlug = cache(getPostBySlugUncached);

export function getAllTags(posts?: BlogPost[]): string[] {
  const allPosts = posts ?? getAllPosts();
  const tags = new Set<string>();
  for (const post of allPosts) {
    for (const tag of post.frontmatter.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
