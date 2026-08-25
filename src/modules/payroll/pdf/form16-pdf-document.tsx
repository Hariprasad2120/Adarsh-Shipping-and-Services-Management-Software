import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { AnnualTaxEstimate } from "@/modules/payroll/tax-engine";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 12 },
  banner: { backgroundColor: "#fff3cd", borderWidth: 1, borderColor: "#e0b400", padding: 8, marginBottom: 12 },
  bannerText: { fontSize: 8, color: "#5c4500" },
  section: { marginBottom: 12, borderWidth: 1, borderColor: "#d0d0d0", padding: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#555" },
  value: { fontWeight: 700 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: "#333" },
  totalLabel: { fontWeight: 700 },
  totalValue: { fontWeight: 700, fontSize: 12 },
});

function money(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type Form16Data = {
  organisationName: string;
  employerPan: string | null;
  employerTan: string | null;
  employeeName: string;
  employeeNumber: string;
  fiscalYear: string;
  estimate: AnnualTaxEstimate;
};

export function Form16PdfDocument({ data }: { data: Form16Data }) {
  const { estimate } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.organisationName}</Text>
        <Text style={styles.subtitle}>Form 16 — Part B (Estimated) — FY {data.fiscalYear}</Text>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ESTIMATE ONLY — not a certified filing document. Computed from the employee&apos;s current
            monthly gross annualized across the fiscal year, not a sum of actual historical payroll runs.
            Digital signature and e-filing are not automated by this system — verify all figures and sign
            with your own DSC tool before filing with the Income Tax Department.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Employer</Text>
            <Text style={styles.value}>{data.organisationName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Employer PAN</Text>
            <Text style={styles.value}>{data.employerPan ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Employer TAN</Text>
            <Text style={styles.value}>{data.employerTan ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Employee</Text>
            <Text style={styles.value}>{data.employeeName} (#{data.employeeNumber})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tax Regime</Text>
            <Text style={styles.value}>{estimate.regime === "NEW" ? "New Regime" : "Old Regime"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income & Deductions</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Gross Annual Salary (estimated)</Text>
            <Text style={styles.value}>{money(estimate.grossAnnualIncome)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Standard Deduction</Text>
            <Text style={styles.value}>{money(estimate.standardDeduction)}</Text>
          </View>
          {estimate.regime === "OLD" ? (
            <View style={styles.row}>
              <Text style={styles.label}>Chapter VI-A Deductions (approved)</Text>
              <Text style={styles.value}>{money(estimate.chapterViaDeductions)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Taxable Income</Text>
            <Text style={styles.totalValue}>{money(estimate.taxableIncome)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Computation</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tax Before Cess</Text>
            <Text style={styles.value}>{money(estimate.taxBeforeCess)}</Text>
          </View>
          {estimate.rebateApplied ? (
            <View style={styles.row}>
              <Text style={styles.label}>Section 87A Rebate</Text>
              <Text style={styles.value}>Applied — nil tax</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Health & Education Cess</Text>
            <Text style={styles.value}>{money(estimate.cess)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimated Tax Liability</Text>
            <Text style={styles.totalValue}>{money(estimate.totalTax)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
