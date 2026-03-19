import Image from "next/image";
import Link from "next/link";

import { Badge } from "@soonlist/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";

import type { BlogFrontmatter } from "~/lib/blog";

interface BlogPostCardProps {
  slug: string;
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

export function BlogPostCard({ slug, frontmatter }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${slug}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        {frontmatter.coverImage && (
          <div className="relative aspect-[2/1] overflow-hidden rounded-t-md">
            <Image
              src={frontmatter.coverImage}
              alt={frontmatter.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {frontmatter.tags.map((tag) => (
              <Badge key={tag} variant="gray">
                {tag}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-xl group-hover:text-interactive-1">
            {frontmatter.title}
          </CardTitle>
          <div className="flex items-center gap-2.5 pt-1">
            {frontmatter.authorImage && (
              <Image
                src={frontmatter.authorImage}
                alt={frontmatter.author}
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <CardDescription>
              {frontmatter.author} &middot; {formatDate(frontmatter.date)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <p className="text-neutral-2">{frontmatter.excerpt}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
