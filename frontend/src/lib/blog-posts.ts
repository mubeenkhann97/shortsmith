import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { creatorGuides } from "@/lib/creator-guides";

export { HOSTED_APP_URL, getSiteUrl } from "@/lib/site";

export interface BlogPost {
  /** Set for editorial content not yet translated; do not localize only its title. */
  language?: "en";
  slug: string;
  image?: { src: string; alt: string; width: number; height: number };
  title: string;
  description: string;
  eyebrow: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  author: string;
  keywords: string[];
  summary: string;
}

export const blogPosts: BlogPost[] = [
  ...creatorGuides.map((guide) => guide.post),
  {
    slug: "shortsmith-vs-opusclip",
    title: "Shortsmith vs OpusClip: A Sourced Comparison",
    description:
      "Shortsmith vs OpusClip compared on deployment, pricing model, watermarks, model choice, and workflow, with a source linked for every claim.",
    eyebrow: "OpusClip Comparison",
    category: "Comparison",
    publishedAt: "2026-10-05",
    updatedAt: "2026-10-05",
    readingTime: "7 min read",
    author: "Shortsmith",
    keywords: [
      "Shortsmith vs OpusClip",
      "OpusClip alternative",
      "OpusClip vs open source",
      "self-hosted OpusClip alternative",
      "OpusClip watermark",
    ],
    summary:
      "A side-by-side of what each product documents, where the two differ, and which one fits your workflow.",
  },
  {
    slug: "self-host-shortsmith-docker",
    title: "How to Self-Host Shortsmith with Docker Compose",
    description:
      "Self-host Shortsmith, the open-source AI video clipper: requirements, .env setup, a fully local Whisper + Ollama option, first-run checks, and a production checklist.",
    eyebrow: "Self-Hosting Guide",
    category: "Guide",
    publishedAt: "2026-10-05",
    updatedAt: "2026-10-05",
    readingTime: "9 min read",
    author: "Shortsmith",
    keywords: [
      "self-host Shortsmith",
      "self-hosted AI video clipper",
      "open-source video clipper Docker",
      "self-hosted OpusClip alternative",
      "Whisper Ollama video clipping",
    ],
    summary:
      "A practical walkthrough of the repository's Docker Compose stack: what each service does, which keys you need, how to run without cloud AI, and what to harden before production.",
  },
  {
    slug: "best-free-opusclip-alternative",
    title: "Free OpusClip Alternative: Self-Hosting Costs and Tradeoffs",
    description: "Looking for a free OpusClip alternative? Understand what self-hosting Shortsmith costs, what you maintain, and when a paid hosted workflow is a better fit.",
    eyebrow: "OpusClip Alternative",
    category: "Comparison",
    publishedAt: "2026-05-07",
    updatedAt: "2026-10-26",
    readingTime: "6 min read",
    author: "Shortsmith",
    keywords: [
      "free OpusClip alternative",
      "OpusClip alternative",
      "AI clip maker",
      "free AI video clipper",
      "open-source OpusClip alternative",
      "YouTube shorts clipper",
    ],
    summary: "The Shortsmith source is free. This guide explains the hardware, provider costs, and maintenance behind a self-hosted clipping workflow so you can decide whether it fits.",
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

/** Overlay translated title, description, and listing copy. Keywords stay English. */
export function applyBlogCopy(post: BlogPost, translate: (key: string) => string): BlogPost {
  if (post.language) return post;
  const slug = post.slug;
  return {
    ...post,
    title: translate(`${slug}.title`),
    description: translate(`${slug}.description`),
    eyebrow: translate(`${slug}.eyebrow`),
    category: translate(`${slug}.category`),
    readingTime: translate(`${slug}.readingTime`),
    summary: translate(`${slug}.summary`),
    image: post.image ? { ...post.image, alt: translate(`${slug}.imageAlt`) } : undefined,
  };
}

export function getBlogPostMetadata(post: BlogPost): Metadata {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${post.slug}`;

  return {
    title: { absolute: `${post.title} | Shortsmith` },
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      siteName: "Shortsmith",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.keywords,
      images: post.image ? [{ url: post.image.src, width: post.image.width, height: post.image.height, alt: post.image.alt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      images: post.image ? [{ url: post.image.src, alt: post.image.alt }] : undefined,
      title: post.title,
      description: post.description,
    },
  };
}
