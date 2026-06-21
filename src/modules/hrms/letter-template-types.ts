export type LetterFieldInputType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "currency"
  | "email"
  | "select"
  | "image";

export type LetterFieldDefaultSource = "employee" | "settings" | "computed" | "manual" | "system";

export type LetterFieldSchemaOption = {
  label: string;
  value: string;
};

export type LetterFieldSchema = {
  key: string;
  label: string;
  inputType: LetterFieldInputType;
  required: boolean;
  defaultSource: LetterFieldDefaultSource;
  placeholder?: string;
  helpText?: string;
  readOnly?: boolean;
  options?: LetterFieldSchemaOption[];
};

export type LetterTemplateEditorDocument = {
  html: string;
};

export type ImportedLetterTemplate = {
  name: string;
  type: string;
  content: string;
  previewHtml: string;
  variables: string[];
  fieldSchema: LetterFieldSchema[];
  editorDocument: LetterTemplateEditorDocument;
  sourceFileName: string;
  sourceDocxPath: string;
};
