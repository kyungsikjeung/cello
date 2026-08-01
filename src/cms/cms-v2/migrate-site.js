import { createSectionState, getCategory } from "./registry.js";

export const CURRENT_CMS_VERSION = 2;

export function migrateSite(input) {
  const site = structuredClone(input);
  const category = site.category || "lesson";
  const definition = getCategory(category);
  site.cmsVersion = CURRENT_CMS_VERSION;
  site.category = definition.id;
  site.templateId =
    site.templateId || site.template || definition.defaultTemplateId;
  site.sections =
    Array.isArray(site.sections) && site.sections.length
      ? site.sections.map((section, index) => ({
          id: section.id,
          enabled: section.enabled !== false,
          order: Number.isFinite(section.order) ? section.order : index,
        }))
      : createSectionState(category);
  return site;
}
