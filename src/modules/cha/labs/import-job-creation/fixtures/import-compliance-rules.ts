export type ImportComplianceRule = {
  ritcPrefix: string;
  title: string;
  severity: "info" | "warning" | "danger";
  message: string;
};

export const importComplianceRules: ImportComplianceRule[] = [
  {
    ritcPrefix: "8504",
    title: "Electrical equipment review",
    severity: "warning",
    message: "Check BIS and single-window requirements for power supply equipment.",
  },
  {
    ritcPrefix: "8471",
    title: "IT goods declaration",
    severity: "info",
    message: "Confirm end-use and serial-number declarations where applicable.",
  },
  {
    ritcPrefix: "290",
    title: "Chemical import controls",
    severity: "danger",
    message: "Review hazardous cargo and supporting document requirements before live filing.",
  },
];

export function getComplianceRulesForRitc(ritcNo: string) {
  return importComplianceRules.filter((rule) => ritcNo.startsWith(rule.ritcPrefix));
}
