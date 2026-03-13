import Image from "next/image";

import { Badge } from "@soonlist/ui/badge";

import type { BlogFrontmatter } from "~/lib/blog";

interface BlogPostHeaderProps {
  frontmatter: BlogFrontmatter;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogPostHeader({ frontmatter }: BlogPostHeaderProps) {
  return (
    <header className="not-prose mb-8">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {frontmatter.tags.map((tag) => (
          <Badge key={tag} variant="gray">
            {tag}
          </Badge>
        ))}
      </div>
      <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
        {frontmatter.title}
      </h1>
      <p className="text-lg text-neutral-2">
        {frontmatter.author} &middot; {formatDate(frontmatter.date)}
      </p>
      {frontmatter.coverImage && (
        <div className="relative mt-8 aspect-[2/1] overflow-hidden rounded-lg">
          <Image
            src={frontmatter.coverImage}
            alt={frontmatter.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
    </header>
  );
}
