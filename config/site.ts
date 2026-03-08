import { SiteConfig } from "@/types"

import { env } from "@/env.mjs"

export const siteConfig: SiteConfig = {
  name: "NutriWise",
  author: "redpangilinan",
  description:
    "Log meals, track calories with AI assistance.",
  keywords: [
    "Health",
    "Calories",
    "Meal tracking",
    "AI",
    "Nutrition",
    "Diet",
    "Fitness",
    "Wellness",
  ],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "https://redpangilinan.live",
  },
  links: {
    github: "https://github.com/redpangilinan/iotawise",
  },
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/og.jpg`,
}
