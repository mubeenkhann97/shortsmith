import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { getTranslations } from "next-intl/server";

import { HomeRouter } from "@/components/home-router";
import { getLandingFaqs } from "@/lib/landing-faq";
import { COMPANY_NAME, GITHUB_URL, SITE_NAME, getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  const title = t("metadata.title");

  return {
    title: {
      absolute: title,
    },
    description: t("metadata.description"),
    alternates: {
      canonical: siteUrl,
    },
    keywords: [
      t("metadata.keywords.clipper"),
      t("metadata.keywords.openSource"),
      t("metadata.keywords.shorts"),
      t("metadata.keywords.longToShorts"),
      t("metadata.keywords.maker"),
    ],
    openGraph: {
      title,
      description: t("metadata.openGraphDescription"),
      url: siteUrl,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t("metadata.twitterDescription"),
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations("marketing");
  // Only a hint: the session itself is still checked on the client.
  const hasSessionCookie = Boolean(getSessionCookie(await headers()));
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      ...(COMPANY_NAME !== SITE_NAME ? { legalName: COMPANY_NAME } : {}),
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      ...(GITHUB_URL ? { sameAs: [GITHUB_URL] } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web, Docker",
      url: siteUrl,
      description: t("metadata.structured.software"),
      featureList: [
        t("metadata.structured.featureDiscovery"),
        t("metadata.structured.featureCrop"),
        t("metadata.structured.featureCaptions"),
        t("metadata.structured.featureExports"),
        t("metadata.structured.featureSelfHost"),
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        category: t("metadata.structured.offerCategory"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
      description: t("metadata.structured.website"),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: getLandingFaqs(t).map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <>
      {structuredData.map((entry) => (
        <script
          key={entry["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <HomeRouter hasSessionCookie={hasSessionCookie} />
    </>
  );
}
