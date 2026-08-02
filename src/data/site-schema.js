import { z } from "zod";

const text = z.string().trim().min(1);
const focus = z.object({ x: z.number().min(10).max(90), y: z.number().min(10).max(90) }).optional();
const theme = z.object({ primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/), background: z.string(), text: z.string(), imageMode: z.enum(["grayscale", "color"]) });
const seo = z.object({ title: text.max(70), description: text.max(180) });
const image = z.object({ image: text, label: text, caption: text, alt: text, focusDesktop: focus, focusMobile: focus });
const meta = z.tuple([text, text, text]);
const optionalPhone = z.string().trim().max(30).default("");
const hotspotPosition = z.object({
  x: z.number().min(5).max(95),
  y: z.number().min(5).max(95),
  width: z.number().int().min(180).max(360),
  side: z.enum(["top", "right", "bottom", "left"]),
});
const hotspotPositions = z.object({
  desktop: hotspotPosition,
  tablet: hotspotPosition,
  mobile: hotspotPosition,
}).optional();
const hotspotScene = z.object({
  image: text,
  alt: text.max(180),
  focusDesktop: focus,
  focusMobile: focus,
}).optional();

export const lessonSiteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), category: z.literal("lesson").default("lesson"), name: text.max(80), wordmark: text.max(40), template: z.literal("editorial-02b"), theme,
  hero: z.object({ kicker: text.max(60), title: z.array(text.max(32)).length(3), description: z.array(text.max(100)).length(2), cta: text.max(40), autoplayMs: z.number().min(2000).max(12000), slides: z.array(image).min(3).max(12) }),
  programs: z.array(z.object({ label: text, title: z.array(text).min(1).max(3), description: text.max(240), image: text, focusDesktop: focus, focusMobile: focus, meta: z.array(meta).min(1).max(6) })).min(1).max(8),
  teacher: z.object({ kicker: text, title: z.array(text).length(2), description: z.array(text).length(2), name: text, role: text, image: text, focusDesktop: focus, focusMobile: focus }),
  visit: z.object({ kicker: text, title: z.array(text).length(2), address: text, transit: text }),
  contact: z.object({ title: z.array(text).length(2), kakaoChannelId: z.string(), phone: text }), seo,
});

const franchiseMedia = z.object({
  kind: z.enum(["image", "video"]), src: text, poster: z.string().default(""), mobileFallback: z.string().default(""), alt: text,
  focusDesktop: focus, focusMobile: focus, autoplay: z.boolean().default(true), muted: z.literal(true).default(true), loop: z.boolean().default(true),
}).superRefine((media, context) => {
  if (media.kind === "video" && (!media.poster || !media.mobileFallback)) context.addIssue({ code: "custom", message: "Hero 동영상에는 Poster와 모바일 대체 이미지가 필요합니다." });
});

export const franchiseSiteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), category: z.literal("franchise"), name: text.max(80), wordmark: text.max(40), template: z.literal("franchise-brand-01"), theme,
  hero: z.object({ kicker: text.max(60), title: z.array(text.max(32)).length(3), description: z.array(text.max(100)).length(2), cta: text.max(30), secondaryCta: text.max(30), media: franchiseMedia }),
  service: z.object({ statusLabel: text, todayHours: text, breakTime: text, lastOrder: text }),
  offerings: z.object({
    title: text,
    description: text.max(240),
    scene: hotspotScene,
    items: z.array(z.object({
      badge: text.max(30),
      name: text.max(60),
      description: text.max(180),
      image: text,
      alt: text,
      focusDesktop: focus,
      focusMobile: focus,
      positions: hotspotPositions,
    })).min(1).max(12),
  }),
  locations: z.object({ title: text, description: text.max(240), items: z.array(z.object({ name: text.max(80), status: text.max(30), address: text.max(160), hours: text.max(80), image: text, alt: text, focusDesktop: focus, focusMobile: focus })).min(1).max(30) }),
  gallery: z.object({ title: text, images: z.array(z.object({ image: text, alt: text, focusDesktop: focus, focusMobile: focus })).min(3).max(12) }),
  franchise: z.object({ title: text, description: text.max(240), advantages: z.array(z.object({ metric: text.max(20), title: text.max(60), description: text.max(180) })).length(3), steps: z.array(z.object({ title: text.max(60), description: text.max(180) })).min(3).max(6) }),
  inquiry: z.object({ label: text, title: z.array(text.max(60)).length(2), description: text.max(240), kakaoUrl: z.string().url(), phone: optionalPhone }), seo,
});

export const restaurantSiteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), category: z.literal("restaurant"), name: text.max(80), wordmark: text.max(40), template: z.literal("restaurant-editorial-01"), theme,
  hero: z.object({ kicker: text.max(60), title: z.array(text.max(32)).length(3), description: z.array(text.max(100)).length(2), cta: text.max(30), secondaryCta: text.max(30), media: franchiseMedia }),
  service: z.object({ statusLabel: text, todayHours: text, breakTime: text, lastOrder: text }),
  menu: z.object({ title: text, description: text.max(240), items: z.array(z.object({ name: text.max(60), description: text.max(120), price: z.number().int().nonnegative(), image: text, alt: text, focusDesktop: focus, focusMobile: focus })).min(1).max(20) }),
  gallery: z.object({ title: text, images: z.array(z.object({ image: text, alt: text, focusDesktop: focus, focusMobile: focus })).min(3).max(12) }),
  visit: z.object({ address: text, transit: text, parking: text, mapUrl: z.string().url() }),
  franchise: z.object({ title: text, description: text.max(240), advantages: z.array(z.object({ metric: text.max(20), title: text.max(60), description: text.max(180) })).length(3), steps: z.array(z.object({ title: text.max(60), description: text.max(180) })).min(3).max(6) }),
  inquiry: z.object({ label: text, title: z.array(text.max(60)).length(2), description: text.max(240), kakaoUrl: z.string().url(), phone: optionalPhone }), seo,
});

export const siteSchema = z.discriminatedUnion("category", [lessonSiteSchema, restaurantSiteSchema, franchiseSiteSchema]);
export function validateSite(site) { return siteSchema.safeParse(site); }
