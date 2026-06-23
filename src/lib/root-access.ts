export const ROOT_CONTROL_EMAIL = "obj268version4@gmail.com";

export function isRootControlEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ROOT_CONTROL_EMAIL;
}
