"use client";

import { useState } from "react";

import { Badge } from "@soonlist/ui/badge";

import type { BlogPost } from "~/lib/blog";
import { BlogPostCard } from "./BlogPostCard";

interface BlogTagFilterProps {
  posts: BlogPost[];
  tags: string[];
}

export function BlogTagFilter({ posts, tags }: BlogTagFilterProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredPosts = activeTag
    ? posts.filter((post) => post.frontmatter.tags.includes(activeTag))
    : posts;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          className="cursor-pointer"
          aria-pressed={activeTag === null}
          aria-label="Show all posts"
        >
          <Badge variant={activeTag === null ? "yellow" : "gray"}>All</Badge>
        </button>
        {tags.map((tag) => (
          <button
            type="button"
            key={tag}
            onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            className="cursor-pointer"
            aria-pressed={tag === activeTag}
            aria-label={`Filter by ${tag}`}
          >
            <Badge variant={tag === activeTag ? "yellow" : "gray"}>{tag}</Badge>
          </button>
        ))}
      </div>
      {filteredPosts.length === 0 ? (
        <p className="py-12 text-center text-neutral-2">
          No posts found for this tag.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogPostCard
              key={post.slug}
              slug={post.slug}
              frontmatter={post.frontmatter}
            />
          ))}
        </div>
      )}
    </>
  );
}
