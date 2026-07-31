export const CHA_CUSTOMS_PERMISSIONS = [
  { key: "cha.customs.master.view", label: "View customs masters", group: "CHA" },
  { key: "cha.customs.master.manage", label: "Manage customs masters", group: "CHA" },
  { key: "cha.customs.master.bulk_import", label: "Bulk import customs masters", group: "CHA" },
  { key: "cha.customs.filing.view", label: "View import/export filing data", group: "CHA" },
  { key: "cha.customs.filing.edit_draft", label: "Edit import/export filing drafts", group: "CHA" },
  { key: "cha.customs.filing.generate_artifact", label: "Generate checklist and flat file", group: "CHA" },
  { key: "cha.customs.icegate.submit", label: "Submit customs filing to ICEGATE", group: "CHA" },
  { key: "cha.customs.icegate.response.view", label: "View ICEGATE responses", group: "CHA" },
  { key: "cha.customs.signing.register", label: "Perform or register customs signing", group: "CHA" },
  { key: "cha.customs.icegate.configure", label: "Administer ICEGATE configuration", group: "CHA" },
] as const;

export type ChaCustomsPermissionKey = (typeof CHA_CUSTOMS_PERMISSIONS)[number]["key"];

export const CHA_CUSTOMS_UNASSIGNED_PERMISSION_KEYS = CHA_CUSTOMS_PERMISSIONS.map(
  (permission) => permission.key,
) as ChaCustomsPermissionKey[];

