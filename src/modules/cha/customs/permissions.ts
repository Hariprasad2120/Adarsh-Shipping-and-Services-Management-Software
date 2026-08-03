export const CHA_CUSTOMS_PERMISSIONS = [
  { key: "cha.customs.master.view", label: "View customs masters", group: "CHA" },
  { key: "cha.customs.master.manage", label: "Manage customs masters", group: "CHA" },
  { key: "cha.customs.master.bulk_import", label: "Bulk import customs masters", group: "CHA" },
] as const;

export type ChaCustomsPermissionKey = (typeof CHA_CUSTOMS_PERMISSIONS)[number]["key"];

export const CHA_CUSTOMS_UNASSIGNED_PERMISSION_KEYS = CHA_CUSTOMS_PERMISSIONS.map(
  (permission) => permission.key,
) as ChaCustomsPermissionKey[];

