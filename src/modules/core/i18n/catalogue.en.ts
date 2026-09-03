/**
 * Stage 2 — enterprise platform: base English message catalogue.
 *
 * Starter set only — common UI verbs and states. Modules register their own
 * namespaced keys with `registerCatalogue("en", { ... })`. Keys are
 * dot-namespaced: `<area>.<thing>`.
 */

import { registerCatalogue } from "./translate";

export const EN_BASE = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.create": "Create",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.loading": "Loading…",
  "common.saving": "Saving…",
  "common.search": "Search",
  "common.retry": "Retry",
  "common.back": "Back",
  "common.next": "Next",
  "common.yes": "Yes",
  "common.no": "No",

  "state.empty": "Nothing here yet",
  "state.error": "Something went wrong",
  "state.error.retry": "Something went wrong. {action}.",
  "state.unauthorized": "You do not have access to this",
  "state.not_found": "Not found",

  "form.required": "{field} is required",
  "form.invalid": "{field} is not valid",
  "form.saved": "Changes saved",

  "count.items": "{count} items",
} as const satisfies Record<string, string>;

registerCatalogue("en", EN_BASE);

export type BaseMessageKey = keyof typeof EN_BASE;
