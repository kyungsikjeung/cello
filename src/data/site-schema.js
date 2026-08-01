import { z } from "zod";

const text = z.string().trim().min(1);
const focus = z
  .object({ x: z.number().min(10).max(90), y: z.number().min(10).max(90) })
  .optional();
const image = z.object({
  image: text,
  label: text,
  caption: text,
  alt: text,
  focusDesktop: focus,
  focusMobile: focus,
});
const meta = z.tuple([text, text, text]);

export const siteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  cmsVersion: z.literal(2),
  category: z.enum(["lesson", "company", "restaurant", "wedding"]),
  templateId: text,
  sections: z
    .array(
      z.object({
        id: text,
        enabled: z.boolean(),
        order: z.number().int().min(0),
      }),
    )
    .min(1),
  name: text.max(80),
  wordmark: text.max(40),
  template: z.string().optional(),
  theme: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string(),
    text: z.string(),
    imageMode: z.enum(["grayscale", "color"]),
  }),
  hero: z.object({
    kicker: text.max(60),
    title: z.array(text.max(32)).length(3),
    description: z.array(text.max(100)).length(2),
    cta: text.max(40),
    autoplayMs: z.number().min(2000).max(12000),
    slides: z.array(image).min(3).max(12),
  }),
  programs: z
    .array(
      z.object({
        label: text,
        title: z.array(text).min(1).max(3),
        description: text.max(240),
        image: text,
        focusDesktop: focus,
        focusMobile: focus,
        meta: z.array(meta).min(1).max(6),
      }),
    )
    .min(1)
    .max(8),
  teacher: z.object({
    kicker: text,
    title: z.array(text).length(2),
    description: z.array(text).length(2),
    name: text,
    role: text,
    image: text,
    focusDesktop: focus,
    focusMobile: focus,
  }),
  visit: z.object({
    kicker: text,
    title: z.array(text).length(2),
    address: text,
    transit: text,
  }),
  contact: z.object({
    title: z.array(text).length(2),
    kakaoChannelId: z.string(),
    phone: text,
  }),
  seo: z.object({ title: text.max(70), description: text.max(180) }),
});

export function validateSite(site) {
  return siteSchema.safeParse(site);
}
