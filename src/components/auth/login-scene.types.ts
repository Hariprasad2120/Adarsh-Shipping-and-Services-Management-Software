export type LoginSceneState =
  | "idle"
  | "userIdFocused"
  | "userIdTyping"
  | "passwordFocused"
  | "passwordTyping"
  | "authenticating"
  | "success"
  | "failure";

export type LoginSceneStatus = {
  eyebrow: string;
  title: string;
};
