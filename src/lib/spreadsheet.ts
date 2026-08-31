import ExcelJS from "exceljs";

export type SpreadsheetCellValue = string | number | boolean | Date | null;
export type SpreadsheetRow = SpreadsheetCellValue[];
export type SpreadsheetObjectRow = Record<string, SpreadsheetCellValue>;

function normalizeCellValue(value: ExcelJS.CellValue): SpreadsheetCellValue {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) {
      throw new Error("Formula cells are not allowed in spreadsheet imports.");
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return normalizeCellValue(value.result as ExcelJS.CellValue);
  }
  return String(value);
}

function toArrayBuffer(input: Buffer | ArrayBuffer | Uint8Array) {
  if (input instanceof ArrayBuffer) return input;
  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
}

export async function loadWorkbook(input: Buffer | ArrayBuffer | Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toArrayBuffer(input) as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}

export function getWorksheetRows(
  worksheet: ExcelJS.Worksheet,
  options: { includeEmpty?: boolean } = {},
): SpreadsheetRow[] {
  const rows: SpreadsheetRow[] = [];
  worksheet.eachRow({ includeEmpty: options.includeEmpty ?? false }, (row) => {
    const values: SpreadsheetRow = [];
    for (let index = 1; index <= row.cellCount; index += 1) {
      values.push(normalizeCellValue(row.getCell(index).value));
    }
    rows.push(values);
  });
  return rows;
}

export function getFirstWorksheet(workbook: ExcelJS.Workbook) {
  return workbook.worksheets[0] ?? null;
}

export function getWorksheetByName(workbook: ExcelJS.Workbook, name: string) {
  return workbook.getWorksheet(name) ?? null;
}

export function objectRowsFromWorksheet(worksheet: ExcelJS.Worksheet): SpreadsheetObjectRow[] {
  const [headerRow, ...dataRows] = getWorksheetRows(worksheet);
  if (!headerRow) return [];
  const headers = headerRow.map((header) => String(header ?? "").trim());

  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])),
    );
}

export function matrixFromWorksheet(worksheet: ExcelJS.Worksheet) {
  return getWorksheetRows(worksheet, { includeEmpty: false });
}

function csvEscape(value: unknown, delimiter: string) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return escaped.includes('"') || escaped.includes("\n") || escaped.includes("\r") || escaped.includes(delimiter)
    ? `"${escaped}"`
    : escaped;
}

export function rowsToDelimitedText(
  rows: Record<string, unknown>[],
  columns: readonly string[],
  delimiter = ",",
) {
  return [
    columns.map((column) => csvEscape(column, delimiter)).join(delimiter),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column], delimiter)).join(delimiter)),
  ].join("\n");
}

export function parseCsvMatrix(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export async function workbookBufferFromRows(
  sheetName: string,
  columns: readonly string[],
  rows: Record<string, unknown>[],
  widths?: readonly number[],
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  worksheet.columns = columns.map((header, index) => ({
    header,
    key: header,
    width: widths?.[index],
  }));
  worksheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function downloadWorkbookFromRows(
  fileName: string,
  sheetName: string,
  headings: readonly string[],
  rows: Record<string, unknown>[],
) {
  const buffer = await workbookBufferFromRows(sheetName, headings, rows);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function excelSerialDateToDate(serial: number) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86_400_000);
}
