export function isRecruitEnabled(): boolean {
  return process.env.RECRUIT_MODULE_ENABLED !== "false";
}
