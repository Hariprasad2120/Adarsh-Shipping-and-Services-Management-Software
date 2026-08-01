import {
  LOCAL_UI_BASE_URL,
  assertLocalUiServerReady,
} from "./local-ui-target.mjs";

await assertLocalUiServerReady(LOCAL_UI_BASE_URL);
console.log(`Monolith responded at ${LOCAL_UI_BASE_URL}.`);
