import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a", lineHeight: 1.5 },
  org: { fontSize: 15, fontWeight: 700 },
  orgSub: { fontSize: 9, color: "#555", marginBottom: 20 },
  title: { fontSize: 13, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  meta: { fontSize: 9, color: "#555", marginBottom: 16 },
  para: { marginBottom: 10 },
  section: { marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: "#d0d0d0", padding: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#555" },
  value: { fontWeight: 700 },
  signBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signName: { fontSize: 9, color: "#555" },
  ackNote: { marginTop: 24, fontSize: 9, color: "#555" },
});

function money(value: number | null | undefined) {
  if (value == null) return "-";
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export type AppraisalLetterData = {
  variant: "OUTCOME" | "INCREMENT";
  organisationName: string;
  employeeName: string;
  employeeNumber: string | null;
  designation: string | null;
  cycleLabel: string;
  issuedOn: string;
  grade: string | null;
  gradeLabel: string | null;
  finalScore: number | null;
  hikePercent: number | null;
  previousSalary: number | null;
  finalSalary: number | null;
  effectiveFrom: string | null;
  signatoryName: string;
  acknowledgedOn: string | null;
};

export function AppraisalLetterDocument({ data }: { data: AppraisalLetterData }) {
  const isIncrement = data.variant === "INCREMENT";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.org}>{data.organisationName}</Text>
        <Text style={styles.orgSub}>Human Resources — Performance &amp; Rewards</Text>

        <Text style={styles.title}>
          {isIncrement ? "Salary Increment Letter" : "Appraisal Outcome Letter"}
        </Text>
        <Text style={styles.meta}>
          Issued on {fmtDate(data.issuedOn)} · Appraisal cycle: {data.cycleLabel}
        </Text>

        <Text style={styles.para}>
          Dear {data.employeeName}
          {data.employeeNumber ? ` (Emp #${data.employeeNumber})` : ""},
        </Text>

        <Text style={styles.para}>
          {isIncrement
            ? `Following the conclusion of your ${data.cycleLabel} performance appraisal, we are pleased to confirm a revision to your compensation as set out below.`
            : `This letter confirms the outcome of your ${data.cycleLabel} performance appraisal. The panel's assessment and the resulting decision are summarised below.`}
        </Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Designation</Text>
            <Text style={styles.value}>{data.designation ?? "-"}</Text>
          </View>
          {!isIncrement ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Overall grade</Text>
                <Text style={styles.value}>
                  {data.grade ?? "-"}
                  {data.gradeLabel ? ` — ${data.gradeLabel}` : ""}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Final score</Text>
                <Text style={styles.value}>
                  {data.finalScore != null ? `${data.finalScore.toFixed(1)} / 100` : "-"}
                </Text>
              </View>
            </>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Increment</Text>
            <Text style={styles.value}>
              {data.hikePercent != null ? `${data.hikePercent}%` : "-"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Previous annual salary</Text>
            <Text style={styles.value}>{money(data.previousSalary)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Revised annual salary</Text>
            <Text style={styles.value}>{money(data.finalSalary)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Effective from</Text>
            <Text style={styles.value}>{fmtDate(data.effectiveFrom)}</Text>
          </View>
        </View>

        <Text style={styles.para}>
          {isIncrement
            ? "All other terms of your employment remain unchanged. Your revised salary will reflect in payroll from the effective date above, including any applicable arrears."
            : "We thank you for your contribution over this period and encourage you to discuss your development plan with your reporting manager."}
        </Text>

        <View style={styles.signBlock}>
          <View>
            <Text>_____________________________</Text>
            <Text style={styles.signName}>{data.signatoryName}</Text>
            <Text style={styles.signName}>For {data.organisationName}</Text>
          </View>
          <View>
            <Text>_____________________________</Text>
            <Text style={styles.signName}>{data.employeeName}</Text>
            <Text style={styles.signName}>
              {data.acknowledgedOn
                ? `Acknowledged on ${fmtDate(data.acknowledgedOn)}`
                : "Employee acknowledgement"}
            </Text>
          </View>
        </View>

        {!data.acknowledgedOn ? (
          <Text style={styles.ackNote}>
            Please acknowledge receipt of this letter in the appraisal portal.
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
