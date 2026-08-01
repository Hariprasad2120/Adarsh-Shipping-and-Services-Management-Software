import type { ReactNode } from "react";

export type CatalogueScope =
  | "foundation"
  | "shared"
  | "cha"
  | "accounting"
  | "crm"
  | "hrms"
  | "attendance"
  | "ams"
  | "communication"
  | "admin";

export type CatalogueStatus = "stable" | "beta" | "deprecated";
export type CatalogueTheme = "light" | "night" | "violet";

export type CatalogueEntry = {
  id: string;
  component: string;
  displayName: string;
  category: string;
  scope: CatalogueScope;
  description: string;
  status: CatalogueStatus;
  source: string;
  render: () => ReactNode;
  themes: CatalogueTheme[];
  states: string[];
  interactive: boolean;
  accessibility: string;
};

export const allCatalogueThemes: CatalogueTheme[] = [
  "light",
  "night",
  "violet",
];
