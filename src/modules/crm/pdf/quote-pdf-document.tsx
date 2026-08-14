import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import type { QuoteDetailRecord } from "@/modules/crm/components/quotes/lib/types";
import { getStateCodeForLocation } from "@/modules/crm/components/quotes/lib/gst-states";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d0d0d0",
    marginBottom: 10,
  },
  headerLogoCell: {
    width: 110,
    padding: 10,
    borderRightWidth: 1,
    borderColor: "#d0d0d0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddressCell: {
    flex: 1,
    padding: 10,
  },
  headerTitleCell: {
    width: 100,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d0d0d0",
    marginBottom: 10,
  },
  metaCell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#d0d0d0",
  },
  metaLine: {
    flexDirection: "row",
    marginBottom: 2,
  },
  metaLabel: {
    color: "#555555",
    width: 90,
  },
  billTo: {
    marginBottom: 10,
  },
  billToLabel: {
    fontSize: 8,
    color: "#555555",
    marginBottom: 2,
  },
  billToName: {
    fontSize: 11,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
  },
  cellSno: { width: 24, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0", textAlign: "center" },
  cellItem: { flex: 3, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0" },
  cellUnit: { width: 48, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0" },
  cellQty: { width: 40, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0", textAlign: "right" },
  cellRate: { width: 55, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0", textAlign: "right" },
  cellTaxPct: { width: 36, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0", textAlign: "right" },
  cellTaxAmt: { width: 55, padding: 4, borderRightWidth: 1, borderColor: "#d0d0d0", textAlign: "right" },
  cellAmount: { width: 60, padding: 4, textAlign: "right" },
  bodyRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#d0d0d0",
  },
  totalsBlock: {
    alignSelf: "flex-end",
    width: 220,
    marginTop: 6,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalsRowStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#d0d0d0",
    paddingTop: 4,
    marginTop: 4,
    fontWeight: 700,
    fontSize: 11,
  },
  section: {
    borderTopWidth: 1,
    borderColor: "#d0d0d0",
    paddingTop: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontWeight: 700,
    marginBottom: 3,
  },
});

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function QuotePdfDocument({
  quote,
  logoDataUri,
}: {
  quote: QuoteDetailRecord;
  logoDataUri?: string;
}) {
  const supplierStateCode = quote.location ? getStateCodeForLocation(quote.location) : "";
  const isSameState = Boolean(supplierStateCode && supplierStateCode === quote.placeOfSupply);
  const compact = quote.pdfTemplate === "Compact Template";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLogoCell}>
            {logoDataUri ? (
              <Image src={logoDataUri} style={{ width: 80, height: 26 }} />
            ) : (
              <Text style={{ fontSize: 8 }}>Adarsh Shipping</Text>
            )}
          </View>
          <View style={styles.headerAddressCell}>
            <Text style={styles.companyName}>Adarsh Shipping and Services</Text>
            <Text>CHOOLAI</Text>
            <Text>Chennai Tamil Nadu 600112</Text>
            <Text>India</Text>
            <Text>GSTIN 33AAAFA4117G1Z5</Text>
          </View>
          <View style={styles.headerTitleCell}>
            <Text style={styles.headerTitle}>QUOTE</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>#</Text>
              <Text>{quote.quoteNumber}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Quote Date</Text>
              <Text>{quote.date}</Text>
            </View>
          </View>
          <View style={[styles.metaCell, { borderRightWidth: 0 }]}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Place Of Supply</Text>
              <Text>{quote.placeOfSupply}</Text>
            </View>
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>{quote.customerName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.cellSno}>#</Text>
            <Text style={styles.cellItem}>Item & Description</Text>
            {!compact ? <Text style={styles.cellUnit}>Unit</Text> : null}
            <Text style={styles.cellQty}>Qty</Text>
            <Text style={styles.cellRate}>Rate</Text>
            {!compact ? (
              <>
                <Text style={styles.cellTaxPct}>%</Text>
                <Text style={styles.cellTaxAmt}>{isSameState ? "CGST+SGST" : "IGST"}</Text>
              </>
            ) : null}
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          {quote.items.map((item, index) => {
            const taxPercent = parseFloat(String(item.tax).match(/[\d.]+/)?.[0] ?? "18");
            const taxAmount = item.amount * (taxPercent / 100);
            return (
              <View key={item.id} style={styles.bodyRow} wrap={false}>
                <Text style={styles.cellSno}>{index + 1}</Text>
                <View style={styles.cellItem}>
                  <Text>{item.name}</Text>
                  {item.description ? (
                    <Text style={{ fontSize: 7, color: "#666666" }}>{item.description}</Text>
                  ) : null}
                </View>
                {!compact ? <Text style={styles.cellUnit}>{item.unit || "PCS"}</Text> : null}
                <Text style={styles.cellQty}>{item.quantity.toFixed(2)}</Text>
                <Text style={styles.cellRate}>{formatMoney(item.price)}</Text>
                {!compact ? (
                  <>
                    <Text style={styles.cellTaxPct}>{taxPercent.toFixed(1)}%</Text>
                    <Text style={styles.cellTaxAmt}>{formatMoney(taxAmount)}</Text>
                  </>
                ) : null}
                <Text style={styles.cellAmount}>{formatMoney(item.amount)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Sub Total</Text>
            <Text>{formatMoney(quote.subtotal)}</Text>
          </View>
          {quote.taxes.map((tax) => (
            <View key={tax.label} style={styles.totalsRow}>
              <Text>{tax.label}</Text>
              <Text>{formatMoney(tax.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text>Discount</Text>
            <Text>{formatMoney(quote.discount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Adjustment</Text>
            <Text>{formatMoney(quote.adjustment)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Round Off</Text>
            <Text>{formatMoney(quote.roundOff)}</Text>
          </View>
          <View style={styles.totalsRowStrong}>
            <Text>Total</Text>
            <Text>{formatMoney(quote.total)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text>{quote.notes || "Looking forward for your business."}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Terms and Conditions</Text>
          <Text>{quote.terms || "No Terms and Conditions"}</Text>
        </View>
      </Page>
    </Document>
  );
}
