import type { Metadata } from "next";

import { BlogTagFilter } from "~/components/blog/BlogTagFilter";
import { getAllPosts, getAllTags } from "~/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Soonlist",
  description: "News, updates, and stories from the Soonlist team.",
  openGraph: {
    title: "Blog | Soonlist",
    description: "News, updates, and stories from the Soonlist team.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const tags = getAllTags(posts);

  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Blog
        </h1>
        <p className="mb-12 text-lg text-neutral-2">
          News, updates, and stories from the Soonlist team.
        </p>
        <BlogTagFilter posts={posts} tags={tags} />
      </div>
    </div>
  );
}
