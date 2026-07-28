export type LoginSceneState =
  | "idle"
  | "userIdFocused"
  | "userIdTyping"
  | "passwordFocused"
  | "passwordTyping"
  | "authenticating"
  | "success"
  | "failure";
