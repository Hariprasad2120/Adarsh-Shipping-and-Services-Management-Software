import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 12 },
  section: { marginBottom: 12, borderWidth: 1, borderColor: "#d0d0d0", padding: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#555" },
  value: { fontWeight: 700 },
  table: { marginTop: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 3 },
  tableCellLabel: { flex: 1 },
  tableCellValue: { width: 90, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: "#333" },
  totalLabel: { fontWeight: 700 },
  totalValue: { fontWeight: 700 },
  netPay: { marginTop: 16, padding: 10, backgroundColor: "#f3f6fb", flexDirection: "row", justifyContent: "space-between" },
  netPayLabel: { fontSize: 11, fontWeight: 700 },
  netPayValue: { fontSize: 14, fontWeight: 700 },
});

function money(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type PayslipData = {
  organisationName: string;
  employeeName: string;
  employeeNumber: string;
  designation: string | null;
  periodLabel: string;
  payableDays: number;
  employmentDays: number;
  unpaidLeaveDays: number;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  grossEarnings: number;
  netPay: number;
  paymentMode: string | null;
  bankAccountMasked: string | null;
};

export function PayslipPdfDocument({ data }: { data: PayslipData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.organisationName}</Text>
        <Text style={styles.subtitle}>Payslip for {data.periodLabel}</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Employee</Text>
            <Text style={styles.value}>{data.employeeName} (#{data.employeeNumber})</Text>
          </View>
          {data.designation ? (
            <View style={styles.row}>
              <Text style={styles.label}>Designation</Text>
              <Text style={styles.value}>{data.designation}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Paid Days</Text>
            <Text style={styles.value}>{data.payableDays} / {data.employmentDays}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>LOP Days</Text>
            <Text style={styles.value}>{data.unpaidLeaveDays}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Mode</Text>
            <Text style={styles.value}>{data.paymentMode ?? "—"}</Text>
          </View>
          {data.bankAccountMasked ? (
            <View style={styles.row}>
              <Text style={styles.label}>Bank Account</Text>
              <Text style={styles.value}>{data.bankAccountMasked}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.table}>
            {data.earnings.map((item) => (
              <View style={styles.tableRow} key={item.label}>
                <Text style={styles.tableCellLabel}>{item.label}</Text>
                <Text style={styles.tableCellValue}>{money(item.amount)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gross Earnings</Text>
            <Text style={styles.totalValue}>{money(data.grossEarnings)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          {data.deductions.length === 0 ? (
            <Text style={styles.label}>No deductions this period.</Text>
          ) : (
            <View style={styles.table}>
              {data.deductions.map((item) => (
                <View style={styles.tableRow} key={item.label}>
                  <Text style={styles.tableCellLabel}>{item.label}</Text>
                  <Text style={styles.tableCellValue}>{money(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.netPay}>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPayValue}>{money(data.netPay)}</Text>
        </View>
      </Page>
    </Document>
  );
}
