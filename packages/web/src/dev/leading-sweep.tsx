// Renders the real header + a wrapped paragraph at a range of lineHeight settings so
// the right value can be picked by looking, not by modelling react-pdf's internals.
import { Document, Page, StyleSheet, Text, View, renderToFile } from "@react-pdf/renderer";

const CANDIDATES = [undefined, 0.8, 0.9, 1.0, 1.1] as const;
const PROSE =
  "Backend engineer with eight years building payment and ledger systems at scale. " +
  "Specialises in correctness-critical services where a rounding error is an incident.";

const base = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 9.5 },
  label: { fontSize: 8, color: "#b91c1c", marginBottom: 3, marginTop: 14 },
  rule: { borderBottomWidth: 0.5, borderBottomColor: "#d1d5db" },
});

function lh(value: number | undefined) {
  return value === undefined ? {} : { lineHeight: value };
}

await renderToFile(
  <Document>
    <Page size="LETTER" style={base.page}>
      {CANDIDATES.map((value, i) => (
        <View key={i} style={base.rule}>
          <Text style={base.label}>lineHeight: {value === undefined ? "default" : value}</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, ...lh(value) }}>
            Priya Raghunathan
          </Text>
          <Text style={{ fontSize: 11, color: "#4b5563", marginTop: 2, ...lh(value) }}>
            Senior Backend Engineer
          </Text>
          <Text style={{ fontSize: 9, color: "#4b5563", marginTop: 6, ...lh(value) }}>
            San Francisco, CA | priya.r@example.com | +1 (415) 555-0142
          </Text>
          <Text style={{ marginTop: 8, ...lh(value) }}>{PROSE}</Text>
        </View>
      ))}
    </Page>
  </Document>,
  process.argv[2] ?? "./sweep.pdf",
);
console.log("ok");
