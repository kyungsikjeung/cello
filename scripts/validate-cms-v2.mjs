import assert from "node:assert/strict";
import { cloneSite } from "../src/data/default-site.js";
import { migrateSite } from "../src/cms/cms-v2/migrate-site.js";
import {
  CATEGORY_IDS,
  categoryRegistry,
  createSectionState,
  getEditorTabs,
  validateCategoryConfig,
} from "../src/cms/cms-v2/registry.js";

const legacy = cloneSite();
delete legacy.cmsVersion;
delete legacy.category;
delete legacy.templateId;
delete legacy.sections;

const migrated = migrateSite(legacy);
assert.equal(migrated.cmsVersion, 2);
assert.equal(migrated.category, "lesson");
assert.equal(migrated.templateId, "editorial-02b");
assert.deepEqual(
  getEditorTabs(migrated.category, migrated.sections).map(([id]) => id),
  ["hero", "program", "teacher", "visit", "theme", "media", "versions"],
);
assert.deepEqual(validateCategoryConfig(migrated), []);

for (const categoryId of CATEGORY_IDS) {
  const category = categoryRegistry[categoryId];
  assert.ok(category.templates.includes(category.defaultTemplateId));
  assert.ok(createSectionState(categoryId).length >= 1);
}

const invalid = migrateSite(legacy);
invalid.sections = invalid.sections.filter((section) => section.id !== "hero");
assert.ok(
  validateCategoryConfig(invalid).some((message) =>
    message.includes("첫 화면"),
  ),
);

console.log("CMS V2 registry and migration checks passed");
