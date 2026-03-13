import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const blogDirectory = path.join(process.cwd(), "content", "blog");

const frontmatterSchema = z.object({
  title: z.string(),
  date: z.string(),
  author: z.string(),
  tags: z.array(z.string()),
  excerpt: z.string(),
  coverImage: z.string().optional(),
  published: z.boolean(),
});

export type BlogFrontmatter = z.infer<typeof frontmatterSchema>;

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
}

export interface BlogPostWithContent extends BlogPost {
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
      const filePath = path.join(blogDirectory, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);
      const parsed = frontmatterSchema.safeParse(data);

      if (!parsed.success) {
        console.warn(`Invalid frontmatter in ${filename}:`, parsed.error);
        return null;
      }

      return { slug, frontmatter: parsed.data };
    })
    .filter((post): post is BlogPost => post !== null);

  const published =
    process.env.NODE_ENV === "production"
      ? posts.filter((p) => p.frontmatter.published)
      : posts;

  return published.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPostWithContent | null {
  const filePath = path.join(blogDirectory, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const parsed = frontmatterSchema.safeParse(data);

  if (!parsed.success) {
    console.warn(`Invalid frontmatter in ${slug}.mdx:`, parsed.error);
    return null;
  }

  return { slug, frontmatter: parsed.data, content };
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.frontmatter.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
