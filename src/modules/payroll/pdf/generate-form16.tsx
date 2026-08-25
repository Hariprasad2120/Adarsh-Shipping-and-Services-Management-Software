import { renderToBuffer } from "@react-pdf/renderer";
import { computeForm16Data } from "./form16-data";
import { Form16PdfDocument } from "./form16-pdf-document";

export async function generateForm16PdfBuffer(
  orgId: string,
  employeeId: string,
  fiscalYear: string,
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const data = await computeForm16Data(orgId, employeeId, fiscalYear);
  if (!data) return null;

  const buffer = await renderToBuffer(<Form16PdfDocument data={data} />);
  return { buffer, fileName: `Form16-${data.employeeNumber}-${fiscalYear}.pdf` };
}
