import { defaultSite } from "./default-site.js";
import { restaurantSite } from "./restaurant-site.js";
import { franchiseSite } from "./franchise-site.js";

const templateEntries = [
  {
    id: "editorial-02b",
    category: "lesson",
    aliases: ["lesson", "cello", "editorial-02b"],
    site: defaultSite,
  },
  {
    id: "franchise-brand-01",
    category: "franchise",
    aliases: ["franchise", "franchise-brand-01"],
    site: franchiseSite,
  },
  {
    id: "restaurant-editorial-01",
    category: "restaurant",
    aliases: ["restaurant", "restaurant-editorial-01", "restaurant-franchise-01", "restaurant-essential-01"],
    site: restaurantSite,
  },
];

const normalize = (value) => value?.trim().toLowerCase() || "";

export function resolveTemplateRequest(search = "") {
  const params = new URLSearchParams(search);
  const requested = normalize(params.get("template") || params.get("category"));

  if (!requested) {
    return { requested: "", entry: templateEntries[0], site: templateEntries[0].site };
  }

  const entry = templateEntries.find(
    (candidate) =>
      candidate.id === requested ||
      candidate.category === requested ||
      candidate.aliases.includes(requested),
  );

  return { requested, entry: entry || null, site: entry?.site || null };
}

export const publicTemplateLinks = templateEntries.map(({ id, category }) => ({
  id,
  category,
  href: `/?template=${category}`,
}));
