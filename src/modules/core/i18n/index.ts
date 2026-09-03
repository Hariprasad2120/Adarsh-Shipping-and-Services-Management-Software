/**
 * Stage 2 — enterprise platform: internationalisation scaffold.
 *
 * `translate.*` — pure catalogue lookup + `{param}` interpolation + `plural`.
 * `catalogue.en` — base English messages (imported for its registration side
 * effect). Number / date / currency formatting lives in
 * `@/modules/core/regional` — always pass an explicit locale / currency.
 *
 * This is a scaffold, not a full i18n runtime: it exists so new strings go
 * through `t()` instead of being concatenated, and so a library (next-intl,
 * Lingui, …) can be dropped in later behind the same call sites.
 */
import "./catalogue.en";

export {
  translate,
  translator,
  plural,
  registerCatalogue,
  getCatalogue,
  hasMessage,
  BASE_LOCALE,
  type LocaleCode,
  type MessageCatalogue,
} from "./translate";
export { EN_BASE, type BaseMessageKey } from "./catalogue.en";
