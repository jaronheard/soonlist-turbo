import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { BlogPostHeader } from "~/components/blog/BlogPostHeader";
import { mdxComponents } from "~/components/blog/MdxComponents";
import { getAllPosts, getPostBySlug } from "~/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found | Soonlist" };
  }

  return {
    title: `${post.frontmatter.title} | Soonlist Blog`,
    description: post.frontmatter.excerpt,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      ...(post.frontmatter.coverImage && {
        images: [post.frontmatter.coverImage],
      }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="prose mx-auto sm:prose-lg lg:prose-xl xl:prose-2xl 2xl:prose-2xl">
        <BlogPostHeader frontmatter={post.frontmatter} />
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>
    </div>
  );
}
