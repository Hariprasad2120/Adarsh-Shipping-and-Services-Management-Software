"use client";

import { ChaTable } from "@/components/monolith/cha-workspace";
import { Textarea } from "@/components/monolith/textarea";
import { Input } from "@/components/monolith/input";
import { NativeSelect } from "@/components/monolith/native-select";
import { DateInput } from "@/components/monolith/date-input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Search, Filter, ExternalLink, MessageSquare, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { Badge, type BadgeVariant } from "@/components/monolith/badge";
import { FileUploadField } from "@/components/monolith/file-upload-field";
import { Modal } from "@/components/monolith/modal";
import { WarningIndicatorPopover } from "@/components/monolith/warning-indicator-popover";
import * as actions from "@/modules/cha/actions";
import Link from "next/link";
import { formatChaBadgeLabel } from "@/lib/cha-badges";
import { ChaPageHeader } from "../_components/cha-operations-shared";

interface ExpensesClientProps {
  initialExpenses: any[];
  filters: {
    status?: string;
    search?: string;
    isUrgent?: boolean;
  };
  currentUserId: string;
  canManageExpenses: boolean;
  canPayExpenses: boolean;
  canCreateExpenses: boolean;
  jobOptions: { id: string; jobNumber: string; title: string; customer?: { name: string } | null }[];
  basePath?: string;
}

function getPaymentProofLinks(paymentProofKey?: string | null) {
  if (!paymentProofKey) return [];
  try {
    const parsed = JSON.parse(paymentProofKey);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    }
  } catch {
    // Older payments stored a single URL directly.
  }
  return [paymentProofKey];
}

function getReceiptLinks(receiptKey?: string | null) {
  if (!receiptKey) return [];
  try {
    const parsed = JSON.parse(receiptKey);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    }
  } catch {
    // Older line items stored a single URL directly.
  }
  return [receiptKey];
}

function getExpenseStatusBadgeVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case "PAID":
    case "RECEIPT_ACKNOWLEDGED":
      return "success";
    case "APPROVED":
    case "READY_FOR_DISBURSEMENT":
      return "default";
    case "UNDER_REVIEW":
    case "ACCOUNTS_REVIEW":
    case "CLARIFICATION_REQUIRED":
      return "warning";
    case "URGENT_PAYMENT_REQUIRED":
    case "REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
}

const FUEL_POLICY_RATE_PER_KM = 3.75;
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

type GeoPoint = { lat: number; lon: number };
type LocationSuggestion = {
  displayName: string;
  lat: number;
  lon: number;
};

type ExpenseRaiseView = "GENERAL" | "FUEL";

type FuelExpenseRow = {
  id: string;
  mode: "KM" | "ROUTE";
  km: string;
  fromAddress: string;
  toAddress: string;
  stopAddresses: string[];
  routeDistanceKm: number | null;
  routeDistanceStatus: string;
  routeCoordinates: GeoPoint[];
  mapSnapshotFile: File | null;
  roundTrip: boolean;
  purpose: string;
  requiredDate: string;
  receiptFiles: File[];
};

function createFuelExpenseRow(): FuelExpenseRow {
  return {
    id: `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mode: "KM",
    km: "",
    fromAddress: "",
    toAddress: "",
    stopAddresses: [],
    routeDistanceKm: null,
    routeDistanceStatus: "",
    routeCoordinates: [],
    mapSnapshotFile: null,
    roundTrip: false,
    purpose: "",
    requiredDate: new Date().toISOString().slice(0, 10),
    receiptFiles: [],
  };
}

function getFuelRowDistanceKm(row: FuelExpenseRow) {
  const oneWayKm = row.mode === "KM" ? Number(row.km) || 0 : row.routeDistanceKm ?? 0;
  return Math.max(0, row.roundTrip ? oneWayKm * 2 : oneWayKm);
}

function getFuelRowAmount(row: FuelExpenseRow) {
  return Math.round(getFuelRowDistanceKm(row) * FUEL_POLICY_RATE_PER_KM * 100) / 100;
}

async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const params = new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "in",
  });
  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Location search failed.");
  const results = await response.json();
  return Array.isArray(results)
    ? results.map((entry: any) => ({
        displayName: String(entry.display_name || ""),
        lat: Number(entry.lat),
        lon: Number(entry.lon),
      })).filter((entry) => entry.displayName && Number.isFinite(entry.lat) && Number.isFinite(entry.lon))
    : [];
}

async function geocodeAddress(address: string): Promise<LocationSuggestion> {
  const results = await searchLocations(address);
  if (!results.length) throw new Error(`Could not find location: ${address}`);
  return results[0];
}

function createRouteSnapshotFile(row: FuelExpenseRow, fileName: string) {
  const coords = row.routeCoordinates;
  if (coords.length < 2) return null;
  const width = 900;
  const height = 420;
  const padding = 36;
  const lats = coords.map((point) => point.lat);
  const lons = coords.map((point) => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const lonSpan = Math.max(maxLon - minLon, 0.0001);
  const points = coords
    .map((point) => {
      const x = padding + ((point.lon - minLon) / lonSpan) * (width - padding * 2);
      const y = height - padding - ((point.lat - minLat) / latSpan) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const escapedFrom = row.fromAddress.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[char] || char));
  const escapedTo = row.toAddress.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[char] || char));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="var(--mnx-accent)"/>
  <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="18" fill="var(--mnx-surface)" stroke="var(--mnx-accent)"/>
  <polyline points="${points}" fill="none" stroke="var(--mnx-accent)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${points.split(" ")[0].split(",")[0]}" cy="${points.split(" ")[0].split(",")[1]}" r="12" fill="var(--mnx-success)"/>
  <circle cx="${points.split(" ").at(-1)?.split(",")[0]}" cy="${points.split(" ").at(-1)?.split(",")[1]}" r="12" fill="var(--mnx-danger)"/>
  <text x="36" y="52" font-family="Arial, sans-serif" font-size="18" fill="var(--mnx-accent)">Fuel route snapshot</text>
  <text x="36" y="${height - 62}" font-family="Arial, sans-serif" font-size="14" fill="var(--mnx-text)">From: ${escapedFrom}</text>
  <text x="36" y="${height - 38}" font-family="Arial, sans-serif" font-size="14" fill="var(--mnx-text)">To: ${escapedTo}</text>
</svg>`;
  return new File([new Blob([svg], { type: "image/svg+xml" })], fileName, { type: "image/svg+xml" });
}

function buildGoogleMapsDirectionsUrl(row: FuelExpenseRow) {
  const origin = row.fromAddress.trim();
  const destination = row.toAddress.trim();
  if (!origin || !destination) return "";
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  const stops = row.stopAddresses.map((stop) => stop.trim()).filter(Boolean);
  if (stops.length) params.set("waypoints", stops.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function LocationSearchInput({
  id,
  label,
  value,
  placeholder,
  required,
  onValueChange,
  onPlaceSelected,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  onValueChange: (value: string) => void;
  onPlaceSelected: (suggestion: LocationSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const query = value.trim();
    setSearchError("");
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchLocations(query)
        .then(setSuggestions)
        .catch((error: Error) => {
          setSuggestions([]);
          setSearchError(error.message);
        })
        .finally(() => setSearching(false));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative space-y-1">
      <label htmlFor={id} className="mnx-label">{label}</label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full text-sm"
        autoComplete="off"
        required={required}
      />
      {searching ? <p className="text-xs mnx-text-muted">Searching OpenStreetMap...</p> : null}
      {searchError ? <p className="text-xs text-destructive">{searchError}</p> : null}
      {suggestions.length ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border mnx-border mnx-bg-surface p-1 shadow-lg">
          {suggestions.map((suggestion) => (
            <Button
              key={`${suggestion.lat}-${suggestion.lon}-${suggestion.displayName}`}
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-xs mnx-text-primary transition mnx-hover-accent"
              onClick={() => {
                onPlaceSelected(suggestion);
                setSuggestions([]);
              }}
            >
              {suggestion.displayName}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ExpensesClient({
  initialExpenses,
  filters,
  currentUserId,
  canManageExpenses,
  canPayExpenses,
  canCreateExpenses,
  jobOptions,
  basePath = "/cha/expenses",
}: ExpensesClientProps) {
  const router = useRouter();

  // Filter state
  const [status, setStatus] = useState(filters.status || "");
  const [search, setSearch] = useState(filters.search || "");
  const [isUrgent, setIsUrgent] = useState<string>(
    filters.isUrgent === true ? "true" : filters.isUrgent === false ? "false" : ""
  );
  const [showQueueFilters, setShowQueueFilters] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [showDirectRequestForm, setShowDirectRequestForm] = useState(false);
  const [directScope, setDirectScope] = useState<"JOB" | "OTHER">("JOB");
  const [directJobQuery, setDirectJobQuery] = useState("");
  const [directOtherPurpose, setDirectOtherPurpose] = useState("");
  const [directApprovalRoute, setDirectApprovalRoute] = useState<"MANAGER_THEN_ACCOUNTS" | "DIRECT_ACCOUNTS">("MANAGER_THEN_ACCOUNTS");
  const [directUrgent, setDirectUrgent] = useState(false);
  const [directUrgencyReason, setDirectUrgencyReason] = useState("");
  const [directCategory, setDirectCategory] = useState("Miscellaneous");
  const [directPurpose, setDirectPurpose] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [directRequiredDate, setDirectRequiredDate] = useState("");
  const [directUpiNumber, setDirectUpiNumber] = useState("");
  const [directUpiId, setDirectUpiId] = useState("");
  const [directLineReceiptFiles, setDirectLineReceiptFiles] = useState<File[]>([]);
  const [raiseView, setRaiseView] = useState<ExpenseRaiseView>("GENERAL");
  const [fuelRows, setFuelRows] = useState<FuelExpenseRow[]>(() => [createFuelExpenseRow()]);
  const [routeLoadingRowId, setRouteLoadingRowId] = useState<string | null>(null);
  const [routePlannerRowId, setRoutePlannerRowId] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState<string | null>(null);

  // Forms
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [clarificationRequestId, setClarificationRequestId] = useState<string | null>(null);
  const [clarificationText, setClarificationText] = useState("");

  const [payRequestId, setPayRequestId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [payProofFiles, setPayProofFiles] = useState<File[]>([]);

  const [resolveQueryId, setResolveQueryId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (isUrgent === "true") params.set("isUrgent", "true");
    if (isUrgent === "false") params.set("isUrgent", "false");
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  const pendingCount = initialExpenses.filter((req) =>
    ["UNDER_REVIEW", "ACCOUNTS_REVIEW", "CLARIFICATION_REQUIRED"].includes(req.status),
  ).length;
  const approvedCount = initialExpenses.filter((req) =>
    ["APPROVED", "READY_FOR_DISBURSEMENT"].includes(req.status),
  ).length;
  const processedCount = initialExpenses.filter((req) =>
    ["PAID", "RECEIPT_ACKNOWLEDGED"].includes(req.status),
  ).length;

  const resetFilters = () => {
    setStatus("");
    setSearch("");
    setIsUrgent("");
    router.push(basePath);
  };

  const handleReviewDecision = async (requestId: string, decision: "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED", remarks?: string) => {
    if ((decision === "CLARIFICATION_REQUIRED" || decision === "REJECTED") && !remarks?.trim()) {
      toast.error("Review remarks are required for rejections or clarification requests.");
      return;
    }

    setLoading(`review-${requestId}`);
    try {
      const res = await actions.reviewExpenseRequestAction(requestId, decision, remarks);

      if (res.ok) {
        toast.success("Expense review decision recorded.");
        setReviewRequestId(null);
        setReviewStatus("");
        setReviewRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Action failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const selectedDirectJob = jobOptions.find((job) => job.jobNumber.toLowerCase() === directJobQuery.trim().toLowerCase());
  const fuelTotalKm = fuelRows.reduce((total, row) => total + getFuelRowDistanceKm(row), 0);
  const fuelTotalAmount = fuelRows.reduce((total, row) => total + getFuelRowAmount(row), 0);

  const updateFuelRow = (rowId: string, patch: Partial<FuelExpenseRow>) => {
    setFuelRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const captureRouteDistance = async (
    rowId: string,
    overrides: Partial<Pick<FuelExpenseRow, "fromAddress" | "toAddress" | "stopAddresses">> = {},
  ) => {
    const row = fuelRows.find((item) => item.id === rowId);
    if (!row) return;
    const routeRow = { ...row, ...overrides };
    const origin = routeRow.fromAddress.trim();
    const destination = routeRow.toAddress.trim();
    const waypoints = routeRow.stopAddresses.map((stop) => stop.trim()).filter(Boolean);
    if (!origin || !destination) return;

    setRouteLoadingRowId(rowId);
    updateFuelRow(rowId, { routeDistanceStatus: "Capturing route distance with free OSRM routing..." });
    try {
      const routeLocations = await Promise.all([origin, ...waypoints, destination].map((address) => geocodeAddress(address)));
      const coordinatePath = routeLocations.map((location) => `${location.lon},${location.lat}`).join(";");
      const routeResponse = await fetch(`${OSRM_ROUTE_URL}/${coordinatePath}?overview=full&geometries=geojson&steps=false`);
      if (!routeResponse.ok) throw new Error("OpenStreetMap routing could not calculate this route.");
      const routeResult = await routeResponse.json();
      const route = routeResult?.routes?.[0];
      if (!route?.distance || !Array.isArray(route.geometry?.coordinates)) {
        throw new Error("OpenStreetMap routing returned no drivable route.");
      }
      const meters = Number(route.distance);
      const distanceKm = Math.round((meters / 1000) * 10) / 10;
      const routeCoordinates = route.geometry.coordinates
        .map(([lon, lat]: [number, number]) => ({ lat: Number(lat), lon: Number(lon) }))
        .filter((point: GeoPoint) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
      const mapSnapshotFile = createRouteSnapshotFile(
        { ...routeRow, routeCoordinates, routeDistanceKm: distanceKm },
        `fuel-route-${new Date().toISOString().slice(0, 10)}-${rowId}.svg`,
      );

      updateFuelRow(rowId, {
        mode: "ROUTE",
        fromAddress: origin,
        toAddress: destination,
        stopAddresses: waypoints,
        routeDistanceKm: distanceKm,
        routeCoordinates,
        mapSnapshotFile,
        routeDistanceStatus: `Free OSRM routing captured ${distanceKm.toLocaleString("en-IN")} one-way KM${mapSnapshotFile ? " and attached the route snapshot" : ""}.`,
      });
    } catch (error: any) {
      updateFuelRow(rowId, {
        routeDistanceKm: null,
        routeCoordinates: [],
        mapSnapshotFile: null,
        routeDistanceStatus: error?.message || "Free routing could not calculate this route.",
      });
    } finally {
      setRouteLoadingRowId(null);
    }
  };

  const renderRoutePlanner = (row: FuelExpenseRow) => (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border mnx-border mnx-bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mnx-label">Route Details</p>
            <p className="text-xs mnx-text-muted">
              Add start, optional stops, and destination before capturing KM.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateFuelRow(row.id, { stopAddresses: [...row.stopAddresses, ""] })}
          >
            <Plus size={14} /> Add Stop
          </Button>
        </div>
        <LocationSearchInput
          id={`fuel-from-address-${row.id}`}
          label="From Address *"
          value={row.fromAddress}
          placeholder="Search starting location"
          required
          onValueChange={(value) =>
            updateFuelRow(row.id, {
              fromAddress: value,
              routeDistanceKm: null,
              routeCoordinates: [],
              mapSnapshotFile: null,
              routeDistanceStatus: "Capture KM after entering route details.",
            })
          }
          onPlaceSelected={(suggestion) => updateFuelRow(row.id, { fromAddress: suggestion.displayName })}
        />
        {row.stopAddresses.map((stopAddress, stopIndex) => (
          <div key={`${row.id}-stop-${stopIndex}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <LocationSearchInput
              id={`fuel-stop-address-${row.id}-${stopIndex}`}
              label={`Stop ${stopIndex + 1}`}
              value={stopAddress}
              placeholder="Search stop location"
              onValueChange={(value) =>
                updateFuelRow(row.id, {
                  stopAddresses: row.stopAddresses.map((item, index) => (index === stopIndex ? value : item)),
                  routeDistanceKm: null,
                  routeCoordinates: [],
                  mapSnapshotFile: null,
                  routeDistanceStatus: "Capture KM after entering route details.",
                })
              }
              onPlaceSelected={(suggestion) =>
                updateFuelRow(row.id, {
                  stopAddresses: row.stopAddresses.map((item, index) => (index === stopIndex ? suggestion.displayName : item)),
                })
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateFuelRow(row.id, {
                  stopAddresses: row.stopAddresses.filter((__, index) => index !== stopIndex),
                  routeDistanceKm: null,
                  routeCoordinates: [],
                  mapSnapshotFile: null,
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <LocationSearchInput
          id={`fuel-to-address-${row.id}`}
          label="To Address *"
          value={row.toAddress}
          placeholder="Search destination"
          required
          onValueChange={(value) =>
            updateFuelRow(row.id, {
              toAddress: value,
              routeDistanceKm: null,
              routeCoordinates: [],
              mapSnapshotFile: null,
              routeDistanceStatus: "Capture KM after entering route details.",
            })
          }
          onPlaceSelected={(suggestion) => updateFuelRow(row.id, { toAddress: suggestion.displayName })}
        />
        <div className="rounded-xl border mnx-border mnx-bg-soft p-3">
          <p className="mnx-label">Captured Distance</p>
          <p className="text-sm mnx-text-primary">
            {row.routeDistanceKm ? `${row.routeDistanceKm.toLocaleString("en-IN")} one-way KM` : "Not captured"}
          </p>
          {row.routeDistanceStatus ? (
            <p className="mt-1 text-xs mnx-text-muted">{row.routeDistanceStatus}</p>
          ) : null}
        </div>
        <div className="rounded-xl border mnx-border mnx-bg-surface p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mnx-label">Free Automatic KM</p>
              <p className="mt-1 text-xs mnx-text-muted">
                Uses OpenStreetMap address search and free OSRM driving distance. It does not require a billing account.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void captureRouteDistance(row.id)}
              disabled={routeLoadingRowId === row.id || !row.fromAddress.trim() || !row.toAddress.trim()}
            >
              {routeLoadingRowId === row.id ? "Capturing..." : "Capture KM"}
            </Button>
          </div>
        </div>
        <div className="rounded-xl border mnx-border mnx-bg-surface p-3">
          <p className="mnx-label">Google Maps Manual Capture</p>
          <p className="mt-1 text-xs mnx-text-muted">
            Opens Google Maps without using paid APIs. Enter the one-way KM shown by Google Maps here.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-1">
              <label className="mnx-label">One-way KM from Google Maps</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={row.routeDistanceKm ?? ""}
                onChange={(event) => {
                  const manualKm = Number(event.target.value);
                  updateFuelRow(row.id, {
                    mode: "ROUTE",
                    routeDistanceKm: Number.isFinite(manualKm) && manualKm > 0 ? manualKm : null,
                    routeDistanceStatus:
                      Number.isFinite(manualKm) && manualKm > 0
                        ? `Manually captured ${manualKm.toLocaleString("en-IN")} one-way KM from Google Maps.`
                        : "Enter the one-way KM shown in Google Maps.",
                    routeCoordinates: [],
                    mapSnapshotFile: null,
                  });
                }}
                placeholder="e.g. 12.4"
                className="h-11 w-full text-sm mnx-numeric"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!buildGoogleMapsDirectionsUrl(row)}
              onClick={() => {
                const url = buildGoogleMapsDirectionsUrl(row);
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              Open Google Maps
            </Button>
          </div>
          <div className="mt-3">
            <FileUploadField
              id={`google-maps-screenshot-${row.id}`}
              label="Google Maps Screenshot"
              accept="image/*,application/pdf"
              compact
              triggerText="Attach Google Maps screenshot or PDF"
              helperText="Optional. Add the screenshot after checking the route in Google Maps."
              selectedFile={
                row.mapSnapshotFile
                  ? {
                      file: row.mapSnapshotFile,
                      name: row.mapSnapshotFile.name,
                      sizeBytes: row.mapSnapshotFile.size,
                    }
                  : null
              }
              onInputChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                updateFuelRow(row.id, {
                  mapSnapshotFile: file,
                  routeDistanceStatus: file
                    ? `${row.routeDistanceStatus || "Manual route captured."} Google Maps screenshot attached.`
                    : row.routeDistanceStatus,
                });
              }}
              onClear={() => updateFuelRow(row.id, { mapSnapshotFile: null })}
            />
          </div>
        </div>
        {row.mapSnapshotFile ? (
          <div className="rounded-xl border mnx-border mnx-bg-soft p-3">
            <p className="mnx-label">Route Evidence</p>
            <p className="mt-1 text-xs mnx-text-primary">
              {row.mapSnapshotFile.type === "image/svg+xml" ? "Generated route snapshot" : "Uploaded route evidence"}:{" "}
              <span className="font-medium">{row.mapSnapshotFile.name}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );

  const resetDirectExpenseForm = () => {
    setDirectScope("JOB");
    setDirectJobQuery("");
    setDirectOtherPurpose("");
    setDirectApprovalRoute("MANAGER_THEN_ACCOUNTS");
    setDirectUrgent(false);
    setDirectUrgencyReason("");
    setDirectCategory("Miscellaneous");
    setDirectPurpose("");
    setDirectAmount("");
    setDirectRequiredDate("");
    setDirectUpiNumber("");
    setDirectUpiId("");
    setDirectLineReceiptFiles([]);
    setRaiseView("GENERAL");
    setFuelRows([createFuelExpenseRow()]);
  };

  const handleCreateDirectExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (directScope === "JOB" && !selectedDirectJob) {
      toast.error("Choose a valid job number from the suggestions or select Other.");
      return;
    }
    if (directScope === "OTHER" && !directOtherPurpose.trim()) {
      toast.error("Enter the purpose for the non-job expense.");
      return;
    }
    if (raiseView === "GENERAL") {
      if (!directPurpose.trim() || Number(directAmount) <= 0) {
        toast.error("Enter a valid purpose and amount.");
        return;
      }
    } else {
      const invalidFuelRow = fuelRows.find((row) => {
        const distanceKm = getFuelRowDistanceKm(row);
        return !row.purpose.trim() || distanceKm <= 0 || !row.requiredDate;
      });
      if (invalidFuelRow) {
        toast.error("Enter purpose, date, and valid distance for every fuel expense.");
        return;
      }
    }
    if (directUrgent && !directUrgencyReason.trim()) {
      toast.error("Enter the urgency reason.");
      return;
    }

    setLoading("direct-expense-request");
    try {
      const formData = new FormData();
      if (directScope === "JOB" && selectedDirectJob) formData.set("jobId", selectedDirectJob.id);
      formData.set("expenseScope", directScope);
      formData.set("directPurpose", directScope === "OTHER" ? directOtherPurpose : "");
      formData.set("approvalRoute", directApprovalRoute);
      formData.set("isUrgent", directUrgent ? "true" : "false");
      formData.set("urgencyReason", directUrgent ? directUrgencyReason : "");
      formData.set("upiNumber", directUpiNumber);
      formData.set("upiId", directUpiId);
      if (raiseView === "FUEL") {
        formData.set(
          "linesJson",
          JSON.stringify(
            fuelRows.map((row, index) => {
              const distanceKm = getFuelRowDistanceKm(row);
              const stopsLabel = row.stopAddresses.map((stop) => stop.trim()).filter(Boolean).join(" via ");
              const routeLabel =
                row.mode === "ROUTE"
                  ? `${row.fromAddress.trim()}${stopsLabel ? ` via ${stopsLabel}` : ""} to ${row.toAddress.trim()}${row.roundTrip ? " and return" : ""}`
                  : `${distanceKm.toLocaleString("en-IN")} KM${row.roundTrip ? " round trip" : ""}`;
              return {
                category: "Fuel Expense",
                purpose: `${row.purpose.trim()} - ${routeLabel}`,
                amount: getFuelRowAmount(row),
                requiredDate: row.requiredDate,
                remarks: `Fuel policy rate INR ${FUEL_POLICY_RATE_PER_KM}/KM. Distance ${distanceKm.toLocaleString("en-IN")} KM. ${row.mode === "ROUTE" ? `Route distance captured using OpenStreetMap routing.${row.mapSnapshotFile ? " Route snapshot attached." : ""} ` : ""}Entry ${index + 1}.`,
              };
            }),
          ),
        );
      } else {
        formData.set("category", directCategory || "Miscellaneous");
        formData.set("purpose", directPurpose);
        formData.set("amount", directAmount);
        formData.set("requiredDate", directRequiredDate);
      }
      if (raiseView === "FUEL") {
        fuelRows.forEach((row, rowIndex) => {
          if (row.mapSnapshotFile) formData.append(`receiptAttachment:${rowIndex}`, row.mapSnapshotFile);
          row.receiptFiles.forEach((file) => formData.append(`receiptAttachment:${rowIndex}`, file));
        });
      } else {
        directLineReceiptFiles.forEach((file) => formData.append("receiptAttachment:0", file));
      }
      const res = await actions.createDirectExpenseRequestWithAttachmentAction(formData);

      if (res.ok) {
        toast.success(directApprovalRoute === "DIRECT_ACCOUNTS" ? "Expense request sent to Accounts." : "Expense request sent for manager review.");
        setShowDirectRequestForm(false);
        resetDirectExpenseForm();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to submit expense request.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleSubmitClarification = async () => {
    if (!clarificationRequestId || !clarificationText.trim()) {
      toast.error("Enter clarification details before submitting.");
      return;
    }
    setLoading(`clarify-${clarificationRequestId}`);
    try {
      const res = await actions.submitExpenseClarificationAction(clarificationRequestId, clarificationText);
      if (res.ok) {
        toast.success("Clarification submitted for review.");
        setClarificationRequestId(null);
        setClarificationText("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to submit clarification.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleReadyForDisbursement = async (requestId: string) => {
    setLoading(`ready-${requestId}`);
    try {
      const res = await actions.markExpenseReadyForDisbursementAction(requestId);
      if (res.ok) {
        toast.success("Expense marked ready for disbursement.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to mark ready for disbursement.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleAccountsApprove = async (requestId: string) => {
    setLoading(`accounts-approve-${requestId}`);
    try {
      const res = await actions.approveAccountsExpenseRequestAction(requestId);
      if (res.ok) {
        toast.success("Accounts approved the expense.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to approve expense.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleRouteToManager = async (requestId: string) => {
    setLoading(`route-manager-${requestId}`);
    try {
      const res = await actions.routeExpenseRequestToManagerAction(requestId);
      if (res.ok) {
        toast.success("Expense routed to manager approval.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to route expense.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Post payment disburse submit
  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payRequestId || !payAmount || !payDate || !payRef || payProofFiles.length === 0) {
      toast.error("All payout fields and payment proof are mandatory.");
      return;
    }

    setLoading(`pay-${payRequestId}`);
    try {
      const formData = new FormData();
      formData.set("amountPaid", payAmount);
      formData.set("paymentDate", payDate);
      formData.set("paymentMethod", payMethod);
      formData.set("transactionReference", payRef);
      payProofFiles.forEach((proofFile) => formData.append("paymentProof", proofFile));
      const res = await actions.postExpensePaymentAction(payRequestId, formData);

      if (res.ok) {
        toast.success("Disbursement payout registered successfully.");
        setPayRequestId(null);
        setPayAmount("");
        setPayDate("");
        setPayRef("");
        setPayProofFiles([]);
        router.refresh();
      } else {
        toast.error(res.error || "Disbursement post failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Resolve query submit
  const handleResolveQuery = async () => {
    if (!resolutionText.trim() || !resolveQueryId) {
      toast.error("Resolution note text is required.");
      return;
    }

    setLoading(`resolve-${resolveQueryId}`);
    try {
      const res = await actions.resolvePaymentQueryAction(resolveQueryId, resolutionText);
      if (res.ok) {
        toast.success("Query resolved successfully.");
        setResolveQueryId(null);
        setResolutionText("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to resolve query.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const activeRoutePlannerRow = fuelRows.find((row) => row.id === routePlannerRowId) ?? null;

  return (
    <>
    <div className="space-y-8">
      {/* Page Header */}
      <ChaPageHeader
        eyebrow={null}
        title="Expenses"
        description="Track and process expense disbursement requests across active custom clearance jobs."
        icon={<CreditCard size={20} />}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="mnx-bg-surface mnx-border mnx-border-accent rounded-xl border mnx-border mnx-bg-surface p-4">
          <p className="mnx-label">Visible Records</p>
          <p className="mt-2 text-xl mnx-text-primary mnx-numeric">{initialExpenses.length}</p>
        </div>
        <div className="rounded-xl border mnx-border mnx-bg-surface p-4">
          <p className="mnx-label">Pending Review</p>
          <p className="mt-2 text-xl mnx-text-primary mnx-numeric">{pendingCount}</p>
        </div>
        <div className="rounded-xl border mnx-border mnx-bg-surface p-4">
          <p className="mnx-label">Approved</p>
          <p className="mt-2 text-xl mnx-text-primary mnx-numeric">{approvedCount}</p>
        </div>
        <div className="rounded-xl border mnx-border mnx-bg-surface p-4">
          <p className="mnx-label">Processed</p>
          <p className="mt-2 text-xl mnx-text-primary mnx-numeric">{processedCount}</p>
        </div>
      </div>

      {canCreateExpenses && showDirectRequestForm ? (
        <section className="rounded-xl border mnx-border mnx-bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="grid min-w-0 grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
              <span className="h-8 w-1 rounded-sm mnx-bg-accent-soft" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="mnx-heading-2 mnx-text-primary">Raise Expense Request</h2>
                <p className="text-xs mnx-text-muted">
                  Submit against a CHA job or choose Other for office expenses.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateDirectExpense} className="border-t mnx-border p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-4">
                  <div className="inline-flex rounded-xl border mnx-border mnx-bg-surface p-1">
                    <Button type="button" variant={raiseView === "GENERAL" ? "default" : "outline"} size="sm" onClick={() => setRaiseView("GENERAL")}>
                      General Expense
                    </Button>
                    <Button type="button" variant={raiseView === "FUEL" ? "default" : "outline"} size="sm" onClick={() => setRaiseView("FUEL")}>
                      Fuel Expenses
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={directScope === "JOB" ? "default" : "outline"} size="sm" onClick={() => setDirectScope("JOB")}>
                      Job Expense
                    </Button>
                    <Button type="button" variant={directScope === "OTHER" ? "default" : "outline"} size="sm" onClick={() => setDirectScope("OTHER")}>
                      Other
                    </Button>
                  </div>

                  {directScope === "JOB" ? (
                    <div className="space-y-1">
                      <label className="mnx-label">Job Number *</label>
                      <Input
                        list="expense-job-suggestions"
                        value={directJobQuery}
                        onChange={(e) => setDirectJobQuery(e.target.value)}
                        placeholder="Type job number..."
                        className="h-11 w-full text-sm"
                        required
                      />
                      <datalist id="expense-job-suggestions">
                        {jobOptions.map((job) => (
                          <option key={job.id} value={job.jobNumber}>
                            {job.customer?.name ? `${job.customer.name} - ${job.title}` : job.title}
                          </option>
                        ))}
                      </datalist>
                      {directJobQuery && !selectedDirectJob ? (
                        <p className="text-xs text-tertiary">Select an existing job number from the suggestions.</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="mnx-label">Other Expense Purpose *</label>
                      <Input
                        value={directOtherPurpose}
                        onChange={(e) => setDirectOtherPurpose(e.target.value)}
                        placeholder="e.g. Office stationery, pantry supplies, local conveyance"
                        className="h-11 w-full text-sm"
                        required
                      />
                    </div>
                  )}

                  {raiseView === "GENERAL" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="mnx-label">Category *</label>
                        <Input
                          value={directCategory}
                          onChange={(e) => setDirectCategory(e.target.value)}
                          placeholder="Miscellaneous"
                          className="h-11 w-full text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="mnx-label">Purpose *</label>
                        <Input
                          value={directPurpose}
                          onChange={(e) => setDirectPurpose(e.target.value)}
                          placeholder="Reason for payment"
                          className="h-11 w-full text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="mnx-label">Amount (INR) *</label>
                        <Input
                          type="number"
                          min="1"
                          value={directAmount}
                          onChange={(e) => setDirectAmount(e.target.value)}
                          placeholder="Amount"
                          className="h-11 w-full text-sm mnx-numeric"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="mnx-label">Required Date</label>
                        <DateInput
                          value={directRequiredDate}
                          onChange={(e) => setDirectRequiredDate(e.target.value)}
                          className="h-11 w-full text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FileUploadField
                          id="direct-expense-line-receipts"
                          label="Line Receipt Attachments"
                          accept="image/*,application/pdf"
                          multiple
                          compact
                          triggerText="Drag and drop receipts, or choose files"
                          helperText="Optional. Add one or more receipts for this expense line."
                          selectedFiles={directLineReceiptFiles.map((file) => ({
                            file,
                            name: file.name,
                            sizeBytes: file.size,
                          }))}
                          onInputChange={(event) => setDirectLineReceiptFiles(Array.from(event.currentTarget.files || []))}
                          onClear={() => setDirectLineReceiptFiles([])}
                          onRemoveSelectedFile={(_, fileIndex) =>
                            setDirectLineReceiptFiles((current) => current.filter((__, index) => index !== fileIndex))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border mnx-border mnx-bg-soft p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="mnx-label">Fuel Policy</p>
                            <p className="text-sm mnx-text-primary">INR {FUEL_POLICY_RATE_PER_KM.toFixed(2)} per KM</p>
                            <p className="mt-1 text-xs mnx-text-muted">
                              Free KM capture uses OSRM routing. Google Maps remains available as a manual evidence fallback.
                            </p>
                          </div>
                          <div className="flex gap-4 text-xs mnx-text-muted">
                            <span className="mnx-numeric">{fuelTotalKm.toLocaleString("en-IN")} KM</span>
                            <span className="mnx-numeric">INR {fuelTotalAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>

                      {fuelRows.map((row, index) => {
                        const distanceKm = getFuelRowDistanceKm(row);
                        const amount = getFuelRowAmount(row);
                        return (
                          <div key={row.id} className="rounded-xl border mnx-border mnx-bg-surface p-4">
                            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="mnx-label">Fuel Expense {index + 1}</p>
                                <p className="text-xs mnx-text-muted">
                                  Distance {distanceKm.toLocaleString("en-IN")} KM • Amount INR {amount.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant={row.mode === "KM" ? "default" : "outline"} size="sm" onClick={() => updateFuelRow(row.id, { mode: "KM" })}>
                                  Enter KM
                                </Button>
                                <Button type="button" variant={row.mode === "ROUTE" ? "default" : "outline"} size="sm" onClick={() => updateFuelRow(row.id, { mode: "ROUTE" })}>
                                  From / To
                                </Button>
                                {fuelRows.length > 1 ? (
                                  <Button type="button" variant="outline" size="sm" onClick={() => setFuelRows((current) => current.filter((item) => item.id !== row.id))}>
                                    Remove
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="mnx-label">Purpose *</label>
                                <Input
                                  value={row.purpose}
                                  onChange={(e) => updateFuelRow(row.id, { purpose: e.target.value })}
                                  placeholder="Client visit, customs run, document pickup..."
                                  className="h-11 w-full text-sm"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="mnx-label">Travel Date *</label>
                                <DateInput
                                  required
                                  value={row.requiredDate}
                                  onChange={(e) => updateFuelRow(row.id, { requiredDate: e.target.value })}
                                  className="h-11 w-full text-sm"
                                />
                              </div>
                              {row.mode === "KM" ? (
                                <div className="space-y-1">
                                  <label className="mnx-label">KM Travelled *</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.km}
                                    onChange={(e) => updateFuelRow(row.id, { km: e.target.value })}
                                    placeholder="Enter distance"
                                    className="h-11 w-full text-sm mnx-numeric"
                                    required
                                  />
                                </div>
                              ) : (
                                <div className="md:col-span-2 rounded-xl border mnx-border mnx-bg-surface p-3">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0 space-y-1">
                                      <p className="mnx-label">Route Planner</p>
                                      <p className="truncate text-sm mnx-text-primary">
                                        {[
                                          row.fromAddress.trim() || "From address not set",
                                          ...(row.stopAddresses.filter((stop) => stop.trim()).length
                                            ? [`${row.stopAddresses.filter((stop) => stop.trim()).length} stop(s)`]
                                            : []),
                                          row.toAddress.trim() || "To address not set",
                                        ].join(" -> ")}
                                      </p>
                                      <p className="text-xs mnx-text-muted">
                                        {row.routeDistanceKm ? `${row.routeDistanceKm.toLocaleString("en-IN")} one-way KM captured` : "Open the planner to enter route, stops, capture KM, and attach map snapshot."}
                                      </p>
                                      {row.mapSnapshotFile ? (
                                        <p className="text-xs font-medium uppercase tracking-[0.08em] mnx-text-accent">
                                          Map snapshot ready
                                        </p>
                                      ) : null}
                                    </div>
                                    <Button type="button" onClick={() => setRoutePlannerRowId(row.id)}>
                                      Open Route Planner
                                    </Button>
                                  </div>
                                </div>
                              )}
                              <label className="flex cursor-pointer items-center gap-3 rounded-xl border mnx-border mnx-bg-surface p-3">
                                <Input
                                  type="checkbox"
                                  checked={row.roundTrip}
                                  onChange={(e) => updateFuelRow(row.id, { roundTrip: e.target.checked })}
                                />
                                <span>
                                  <span className="block text-sm font-medium mnx-text-primary">Round trip</span>
                                  <span className="text-xs mnx-text-muted">Doubles the captured one-way KM.</span>
                                </span>
                              </label>
                              <div className="md:col-span-2">
                                <FileUploadField
                                  id={`fuel-expense-line-receipts-${row.id}`}
                                  label="Line Receipt Attachments"
                                  accept="image/*,application/pdf"
                                  multiple
                                  compact
                                  triggerText="Drag and drop fuel receipts, or choose files"
                                  helperText="Optional. Add one or more receipts for this fuel line."
                                  selectedFiles={row.receiptFiles.map((file) => ({
                                    file,
                                    name: file.name,
                                    sizeBytes: file.size,
                                  }))}
                                  onInputChange={(event) => updateFuelRow(row.id, { receiptFiles: Array.from(event.currentTarget.files || []) })}
                                  onClear={() => updateFuelRow(row.id, { receiptFiles: [] })}
                                  onRemoveSelectedFile={(_, fileIndex) =>
                                    updateFuelRow(row.id, {
                                      receiptFiles: row.receiptFiles.filter((__, index) => index !== fileIndex),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <Button type="button" variant="outline" size="sm" onClick={() => setFuelRows((current) => [...current, createFuelExpenseRow()])}>
                        <Plus size={14} /> Add Fuel Expense
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="mnx-label">UPI Number</label>
                      <Input
                        value={directUpiNumber}
                        onChange={(e) => setDirectUpiNumber(e.target.value)}
                        placeholder="Payee mobile number"
                        className="h-11 w-full text-sm mnx-numeric"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="mnx-label">UPI ID</label>
                      <Input
                        value={directUpiId}
                        onChange={(e) => setDirectUpiId(e.target.value)}
                        placeholder="name@bank"
                        className="h-11 w-full text-sm"
                      />
                    </div>
                  </div>
                </div>

                <aside className="space-y-4 mnx-border xl:border-l xl:pl-5">
                  <div className="space-y-2">
                    <p className="mnx-label">Approval Route</p>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border mnx-border mnx-bg-surface p-3">
                      <Input
                        type="radio"
                        name="directApprovalRoute"
                        value="MANAGER_THEN_ACCOUNTS"
                        checked={directApprovalRoute === "MANAGER_THEN_ACCOUNTS"}
                        onChange={() => setDirectApprovalRoute("MANAGER_THEN_ACCOUNTS")}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium mnx-text-primary">Via manager, then Accounts</span>
                        <span className="text-xs mnx-text-muted">Manager approves first; Accounts handles disbursement.</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border mnx-border mnx-bg-surface p-3">
                      <Input
                        type="radio"
                        name="directApprovalRoute"
                        value="DIRECT_ACCOUNTS"
                        checked={directApprovalRoute === "DIRECT_ACCOUNTS"}
                        onChange={() => setDirectApprovalRoute("DIRECT_ACCOUNTS")}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium mnx-text-primary">Direct to Accounts</span>
                        <span className="text-xs mnx-text-muted">Accounts can approve or send it to the manager.</span>
                      </span>
                    </label>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border mnx-border mnx-bg-surface p-3">
                    <Input
                      type="checkbox"
                      checked={directUrgent}
                      onChange={(e) => setDirectUrgent(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium mnx-text-primary">Mark urgent</span>
                      <span className="text-xs mnx-text-muted">Flags priority without bypassing approval.</span>
                    </span>
                  </label>

                  {directUrgent ? (
                    <div className="space-y-1">
                      <label className="mnx-label text-tertiary">Urgency Reason *</label>
                      <Input
                        value={directUrgencyReason}
                        onChange={(e) => setDirectUrgencyReason(e.target.value)}
                        placeholder="Why is this urgent?"
                        className="h-11 w-full text-sm"
                        required
                      />
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowDirectRequestForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading !== null}>
                      Submit Request
                    </Button>
                  </div>
                </aside>
            </div>
          </form>
        </section>
      ) : null}

      {/* Expenses queue */}
      <div className="w-full overflow-hidden rounded-xl border mnx-border mnx-bg-surface shadow-sm">
        <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-8 w-1 rounded-sm mnx-bg-accent-soft" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="mnx-heading-2 mnx-text-primary">Expenses Queue</h2>
              <p className="text-xs mnx-text-muted">{initialExpenses.length} records visible</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 md:max-w-3xl">
            <div className="relative min-w-0 flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center mnx-text-muted">
                <Search size={16} />
              </span>
              <Input
                type="text"
                placeholder="Search job #, customer, requester..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className="h-10 w-full pl-10 pr-4 text-sm font-sans"
              />
            </div>

            <div className="relative">
              <Button
                type="button"
                aria-label="Open queue filters"
                title="Queue filters"
                onClick={() => setShowQueueFilters((value) => !value)}
                className="flex size-10 items-center justify-center rounded-xl border mnx-border mnx-bg-surface mnx-text-accent transition-all mnx-shadow-panel"
              >
                <Filter size={17} />
              </Button>

              {showQueueFilters ? (
                <div className="absolute right-0 z-20 mt-2 w-[min(92vw,360px)] space-y-3 rounded-xl border mnx-border mnx-bg-surface p-4 shadow-lg">
                  <div className="grid gap-3">
                    <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full text-sm font-sans">
                      <option value="">All Statuses</option>
                      <option value="ACCOUNTS_REVIEW">ACCOUNTS REVIEW</option>
                      <option value="UNDER_REVIEW">UNDER REVIEW</option>
                      <option value="CLARIFICATION_REQUIRED">CLARIFICATION REQUIRED</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="READY_FOR_DISBURSEMENT">READY FOR DISBURSEMENT</option>
                      <option value="PAID">PAID</option>
                      <option value="RECEIPT_ACKNOWLEDGED">RECEIPT ACKNOWLEDGED</option>
                      <option value="REJECTED">REJECTED</option>
                    </NativeSelect>

                    <NativeSelect value={isUrgent} onChange={(e) => setIsUrgent(e.target.value)} className="h-10 w-full text-sm font-sans">
                      <option value="">All Urgency levels</option>
                      <option value="true">Urgent Escalated Only</option>
                      <option value="false">Standard Priority Only</option>
                    </NativeSelect>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowQueueFilters(false);
                        applyFilters();
                      }}
                      className="text-xs"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <Button onClick={applyFilters} className="h-10 px-4 text-xs">
              Apply
            </Button>
            {canCreateExpenses ? (
              <Button
                type="button"
                variant={showDirectRequestForm ? "outline" : "default"}
                onClick={() => setShowDirectRequestForm((value) => !value)}
                className="h-10 shrink-0 px-4 text-xs"
              >
                <Plus size={14} /> New Request
              </Button>
            ) : null}
          </div>
        </div>

        {initialExpenses.length === 0 ? (
          <div className="m-5 rounded-xl border mnx-border mnx-bg-surface p-12 text-center mnx-text-muted shadow-sm">
            <CreditCard size={48} className="mx-auto mb-3 text-outline-variant" />
            <p className="text-sm font-semibold">Disbursement queue is currently empty.</p>
            <p className="mt-1 text-xs">Pending expense requests from operations will appear here.</p>
          </div>
        ) : (
          <div className="w-full mnx-bg-surface">
            <div className="hidden w-full grid-cols-[minmax(320px,1.8fr)_44px_minmax(170px,0.8fr)_minmax(130px,0.7fr)_minmax(220px,0.9fr)] items-center mnx-bg-soft px-5 py-4 mnx-text-primary md:grid">
              <span className="mnx-label">Request</span>
              <span aria-hidden="true" />
              <span className="mnx-label text-center">Status</span>
              <span className="mnx-label text-right">Amount</span>
              <span className="mnx-label text-right">Actions</span>
            </div>

            {initialExpenses.map((req) => {
              const isUrgent = req.isUrgent;
              const sum = req.lines.reduce((tot: number, l: any) => tot + Number(l.amount), 0);
              const isExpanded = expandedExpenseId === req.id;
              const isConcernedManager =
                req.routedManagerId === currentUserId ||
                req.job?.assignedManagerId === currentUserId ||
                req.job?.assignments?.some(
                  (assignment: any) => assignment.userId === currentUserId && assignment.responsibility === "APPROVAL",
                );
              const isAssignedAccountsUser = req.job?.assignments?.some(
                (assignment: any) => assignment.userId === currentUserId && assignment.responsibility === "ACCOUNTS",
              );
              const canAccountsReviewThisExpense = Boolean((canPayExpenses || isAssignedAccountsUser) && req.status === "ACCOUNTS_REVIEW");
              const canReviewThisExpense = Boolean(
                (canManageExpenses || isConcernedManager) && req.status === "UNDER_REVIEW",
              );
              const canClarifyThisExpense = req.requestedById === currentUserId && req.status === "CLARIFICATION_REQUIRED";
              const canMarkReadyThisExpense = Boolean((canPayExpenses || isAssignedAccountsUser) && req.status === "APPROVED");
              const canPayThisExpense = Boolean(
                (canPayExpenses || isAssignedAccountsUser) &&
                  ["APPROVED", "READY_FOR_DISBURSEMENT"].includes(req.status),
              );
              const openReviewForm = (decision: "CLARIFICATION_REQUIRED" | "REJECTED") => {
                setExpandedExpenseId(req.id);
                setReviewRequestId(req.id);
                setReviewStatus(decision);
                setReviewRemarks("");
                setPayRequestId(null);
              };
              const openPaymentForm = () => {
                setExpandedExpenseId(req.id);
                setPayRequestId(req.id);
                setPayAmount(String(sum));
                setPayDate(new Date().toISOString().slice(0, 10));
                setPayRef("");
                setPayProofFiles([]);
                setReviewRequestId(null);
              };

              return (
                <div
                  key={req.id}
                  className="cha-expense-row border-t mnx-border first:border-t-0"
                  data-urgent={isUrgent ? "true" : "false"}
                >
                  <div
                    className="grid w-full gap-3 bg-transparent px-5 py-4 md:grid-cols-[minmax(320px,1.8fr)_44px_minmax(170px,0.8fr)_minmax(130px,0.7fr)_minmax(220px,0.9fr)] md:items-center"
                  >
                    <Button
                      type="button"
                      onClick={() => setExpandedExpenseId(isExpanded ? null : req.id)}
                      className="mnx-plain flex min-w-0 items-start gap-3 text-left"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border mnx-border mnx-bg-surface mnx-text-muted">
                        <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-3">
                          {req.jobId && req.job ? (
                            <Link
                              href={`/cha/jobs/${req.jobId}`}
                              className="cha-expense-request-title truncate text-sm font-medium mnx-text-accent hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {req.job.jobNumber}
                            </Link>
                          ) : (
                            <span className="cha-expense-request-title truncate text-sm font-medium mnx-text-primary">
                              {req.directPurpose ?? "Other Expense"}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs mnx-text-muted">
                          {req.job?.customer?.name ?? req.directPurpose ?? "Other expense"} • Requested by {req.requestedBy?.name}
                        </span>
                      </span>
                    </Button>

                    <div className="flex items-center justify-start">
                      {isUrgent ? (
                        <WarningIndicatorPopover
                          ariaLabel="Urgent expense action needed"
                          tone="warning"
                          eyebrow="URGENT EXPENSE"
                          description="This expense was marked urgent and needs priority attention from the assigned approver or Accounts user."
                          meta={req.urgencyReason ? `Reason: ${req.urgencyReason}` : undefined}
                          childrenLayout="stack"
                          childrenClassName="hidden"
                        >
                          <span />
                        </WarningIndicatorPopover>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-center">
                      <span className="mnx-label md:hidden">Status</span>
                      <Badge variant={getExpenseStatusBadgeVariant(req.status)} className="uppercase">
                        {formatChaBadgeLabel(req.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:block md:text-right">
                      <span className="mnx-label md:hidden">Amount</span>
                      <span className="text-lg mnx-text-accent mnx-numeric">₹{sum.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canAccountsReviewThisExpense ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleRouteToManager(req.id)} className="text-xs" disabled={loading !== null}>
                            Route
                          </Button>
                          <Button size="sm" onClick={() => handleAccountsApprove(req.id)} className="text-xs" disabled={loading !== null}>
                            Approve
                          </Button>
                        </>
                      ) : null}
                      {canReviewThisExpense ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openReviewForm("CLARIFICATION_REQUIRED")} className="text-xs">
                            Clarify
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openReviewForm("REJECTED")} className="text-xs">
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => handleReviewDecision(req.id, "APPROVED")} className="text-xs" disabled={loading !== null}>
                            Approve
                          </Button>
                        </>
                      ) : null}
                      {canClarifyThisExpense ? (
                        <Button variant="outline" size="sm" onClick={() => {
                          setExpandedExpenseId(req.id);
                          setClarificationRequestId(req.id);
                          setClarificationText(req.clarificationResponse || "");
                        }} className="text-xs">
                          Clarification
                        </Button>
                      ) : null}
                      {canMarkReadyThisExpense ? (
                        <Button variant="outline" size="sm" onClick={() => handleReadyForDisbursement(req.id)} className="text-xs" disabled={loading !== null}>
                          Ready
                        </Button>
                      ) : null}
                      {canPayThisExpense ? (
                        <Button size="sm" onClick={openPaymentForm} className="text-xs">
                          Payout
                        </Button>
                      ) : null}
                      {!canAccountsReviewThisExpense && !canReviewThisExpense && !canClarifyThisExpense && !canMarkReadyThisExpense && !canPayThisExpense ? (
                        <span className="text-xs mnx-text-muted">View-only</span>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t mnx-border mnx-bg-surface p-4">
                      <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] xl:items-start">
                        <div className="min-w-0 space-y-4">
                          <section className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="mnx-heading-3 mnx-text-primary">Expense Lines</h3>
                              <span className="text-xs mnx-text-muted mnx-numeric">{req.lines.length} lines</span>
                            </div>
                            <div className="w-full overflow-hidden border-y mnx-border mnx-bg-surface rounded-none">
                              <ChaTable className="mnx-cha-table mnx-cha-table w-full">
                                <thead>
                                  <tr>
                                    <th>Category</th>
                                    <th>Purpose</th>
                                    <th>Required Date</th>
                                    <th>Receipt</th>
                                    <th className="text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {req.lines.map((line: any) => (
                                    <tr key={line.id}>
                                      <td className="mnx-label">{line.category}</td>
                                      <td>{line.purpose}</td>
                                      <td className="mnx-numeric">
                                        {line.requiredDate ? new Date(line.requiredDate).toLocaleDateString("en-IN") : "Not recorded"}
                                      </td>
                                      <td>
                                        {getReceiptLinks(line.supportingDocumentKey).length ? (
                                          <div className="flex flex-wrap gap-2">
                                            {getReceiptLinks(line.supportingDocumentKey).map((receiptLink, receiptIndex) => (
                                              <a
                                                key={`${receiptLink}-${receiptIndex}`}
                                                href={receiptLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-medium mnx-text-accent hover:underline"
                                              >
                                                Receipt {receiptIndex + 1}
                                              </a>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-xs mnx-text-muted">Not attached</span>
                                        )}
                                      </td>
                                      <td className="text-right mnx-numeric">₹{Number(line.amount).toLocaleString("en-IN")}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </ChaTable>
                            </div>
                          </section>

                          {req.upiNumber || req.upiId ? (
                            <section className="grid gap-3 md:grid-cols-2">
                              {req.upiNumber ? (
                                <div className="rounded-xl border mnx-border mnx-bg-surface p-4">
                                  <p className="mnx-label">UPI Number</p>
                                  <p className="mt-1 text-sm mnx-text-primary mnx-numeric">{req.upiNumber}</p>
                                </div>
                              ) : null}
                              {req.upiId ? (
                                <div className="rounded-xl border mnx-border mnx-bg-surface p-4">
                                  <p className="mnx-label">UPI ID</p>
                                  <p className="mt-1 text-sm mnx-text-primary">{req.upiId}</p>
                                </div>
                              ) : null}
                            </section>
                          ) : null}

                          {isUrgent && req.urgencyReason ? (
                            <section className="mnx-bg-surface mnx-border mnx-border-warning rounded-xl border border-tertiary/35 mnx-bg-surface p-4 text-xs leading-relaxed">
                              <p className="mnx-label text-tertiary">Urgency Justification</p>
                              <p className="mt-2 mnx-text-primary">{req.urgencyReason}</p>
                            </section>
                          ) : null}

                          {req.queries?.length ? (
                            <section className="space-y-3">
                              <h3 className="mnx-heading-3 mnx-text-primary">Queries</h3>
                              {req.queries.map((q: any) => (
                                <div key={q.id} className="rounded-xl border border-tertiary/35 mnx-bg-surface p-4 text-xs">
                                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <p className="mnx-label text-tertiary">Disbursement Query</p>
                                      <p className="mt-1 mnx-text-primary">{q.queryText}</p>
                                      <p className="mt-1 text-[10px] mnx-text-muted">Raised by {q.author?.name}</p>
                                    </div>
                                    <Badge variant={q.resolved ? "success" : "warning"} className="uppercase">
                                      {q.resolved ? "Resolved" : "Open"}
                                    </Badge>
                                  </div>

                                  {q.resolved ? (
                                    <div className="mt-3 border-t mnx-border pt-3">
                                      <p className="mnx-text-primary">{q.resolutionText || "No resolution note recorded."}</p>
                                      <p className="mt-1 text-[10px] mnx-text-muted">Resolved by {q.resolvedBy?.name}</p>
                                    </div>
                                  ) : canPayThisExpense && resolveQueryId === q.id ? (
                                    <div className="mt-3 space-y-2 border-t mnx-border pt-3">
                                      <Input
                                        type="text"
                                        placeholder="Enter query resolution note details..."
                                        value={resolutionText}
                                        onChange={(e) => setResolutionText(e.target.value)}
                                        className="w-full text-xs font-sans"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setResolveQueryId(null)}>
                                          Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleResolveQuery} disabled={loading !== null}>
                                          Confirm Resolution
                                        </Button>
                                      </div>
                                    </div>
                                  ) : canPayThisExpense ? (
                                    <Button
                                      onClick={() => {
                                        setResolveQueryId(q.id);
                                        setResolutionText("");
                                      }}
                                      className="mnx-plain mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-tertiary hover:underline"
                                    >
                                      <MessageSquare size={12} /> Post Resolution Reply
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </section>
                          ) : null}

                          {req.payments?.length ? (
                            <section className="space-y-3">
                              <h3 className="mnx-heading-3 mnx-text-primary">Payouts</h3>
                              {req.payments.map((payment: any) => (
                                <div
                                  key={payment.id}
                                  className="rounded-xl border mnx-border mnx-bg-surface p-4 text-xs"
                                >
                                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <p className="font-medium mnx-text-primary">Payout completed via {payment.paymentMethod}</p>
                                      <p className="mt-1 text-[10px] mnx-text-muted">
                                        Txn ID: {payment.transactionReference} • Paid by {payment.paidBy?.name}
                                      </p>
                                      {getPaymentProofLinks(payment.paymentProofKey).length ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {getPaymentProofLinks(payment.paymentProofKey).map((proofLink, index) => (
                                            <a
                                              key={`${proofLink}-${index}`}
                                              href={proofLink}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex text-xs font-medium mnx-text-accent hover:underline"
                                            >
                                              View payment proof {index + 1}
                                            </a>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                    <span className="mnx-text-muted mnx-numeric">
                                      {new Date(payment.paymentDate).toLocaleDateString("en-IN")}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </section>
                          ) : null}
                        </div>

                        <aside className="grid gap-4 rounded-xl border mnx-border mnx-bg-surface p-4">
                          <section className="space-y-3">
                            <h3 className="mnx-heading-3 mnx-text-primary">Audit Trail</h3>
                            {req.statusHistory?.length ? (
                              <div className="max-h-72 space-y-3 overflow-y-auto pr-2">
                                {req.statusHistory.map((entry: any) => (
                                  <div key={entry.id} className="border-l-2 mnx-border pl-3 text-xs">
                                    <p className="font-medium mnx-text-primary">{formatChaBadgeLabel(entry.status)}</p>
                                    <p className="mt-1 mnx-text-muted">{entry.remarks || "No remarks recorded."}</p>
                                    <p className="mt-1 text-[10px] mnx-text-muted mnx-numeric">
                                      {new Date(entry.createdAt).toLocaleString("en-IN")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs mnx-text-muted">No audit entries recorded yet.</p>
                            )}
                          </section>

                          <div className="space-y-5">
                          {canAccountsReviewThisExpense || canReviewThisExpense || canClarifyThisExpense || canMarkReadyThisExpense || canPayThisExpense ? (
                            <section className="space-y-3">
                              <h3 className="mnx-heading-3 mnx-text-primary">Permitted Actions</h3>
                              <div className="flex flex-wrap gap-2">
                                {canAccountsReviewThisExpense ? (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => handleRouteToManager(req.id)} className="text-xs" disabled={loading !== null}>
                                      Route to Manager
                                    </Button>
                                    <Button size="sm" onClick={() => handleAccountsApprove(req.id)} className="text-xs" disabled={loading !== null}>
                                      Approve from Accounts
                                    </Button>
                                  </>
                                ) : null}
                                {canReviewThisExpense ? (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openReviewForm("CLARIFICATION_REQUIRED")} className="text-xs">
                                      Require Clarification
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => openReviewForm("REJECTED")} className="text-xs">
                                      Reject
                                    </Button>
                                    <Button size="sm" onClick={() => handleReviewDecision(req.id, "APPROVED")} className="text-xs" disabled={loading !== null}>
                                      Approve
                                    </Button>
                                  </>
                                ) : null}
                                {canClarifyThisExpense ? (
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setClarificationRequestId(req.id);
                                    setClarificationText(req.clarificationResponse || "");
                                  }} className="text-xs">
                                    Submit Clarification
                                  </Button>
                                ) : null}
                                {canMarkReadyThisExpense ? (
                                  <Button variant="outline" size="sm" onClick={() => handleReadyForDisbursement(req.id)} className="text-xs" disabled={loading !== null}>
                                    Ready for Disbursement
                                  </Button>
                                ) : null}
                                {canPayThisExpense ? (
                                  <Button size="sm" onClick={openPaymentForm} className="text-xs">
                                    Register Payout
                                  </Button>
                                ) : null}
                              </div>
                            </section>
                          ) : (
                            <p className="text-xs mnx-text-muted">You have view-only access for this expense.</p>
                          )}

                          {canReviewThisExpense && reviewRequestId === req.id ? (
                            <section className="space-y-3 rounded-xl border mnx-border mnx-bg-surface p-4">
                              <h3 className="mnx-heading-3 mnx-text-primary">
                                {reviewStatus === "REJECTED" ? "Reject Expense" : "Require Clarification"}
                              </h3>
                              <Input
                                type="text"
                                placeholder={reviewStatus === "REJECTED" ? "Rejection reason..." : "Clarification needed..."}
                                value={reviewRemarks}
                                onChange={(e) => setReviewRemarks(e.target.value)}
                                className="w-full text-xs font-sans"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setReviewRequestId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant={reviewStatus === "REJECTED" ? "destructive" : "default"}
                                  onClick={() => handleReviewDecision(req.id, reviewStatus as "CLARIFICATION_REQUIRED" | "REJECTED", reviewRemarks)}
                                  disabled={loading !== null}
                                >
                                  Submit Decision
                                </Button>
                              </div>
                            </section>
                          ) : null}

                          {canClarifyThisExpense && clarificationRequestId === req.id ? (
                            <section className="space-y-3 rounded-xl border mnx-border mnx-bg-surface p-4">
                              <h3 className="mnx-heading-3 mnx-text-primary">Clarification Response</h3>
                              <Textarea
                                placeholder="Enter the clarification requested by the reviewer..."
                                value={clarificationText}
                                onChange={(e) => setClarificationText(e.target.value)}
                                className="min-h-24 w-full text-xs font-sans"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setClarificationRequestId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={handleSubmitClarification} disabled={loading !== null}>
                                  Submit Clarification
                                </Button>
                              </div>
                            </section>
                          ) : null}

                          {canPayThisExpense && payRequestId === req.id ? (
                            <form onSubmit={handlePostPayment} className="space-y-4 rounded-xl border mnx-border-accent mnx-bg-surface p-4">
                              <h3 className="mnx-heading-3 mnx-text-primary">Payout Details</h3>
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <label className="mnx-label block">Amount Paid (₹) *</label>
                                  <Input
                                    type="number"
                                    required
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="h-11 w-full text-xs font-mono mnx-numeric"
                                  />
                                </div>
                                <div>
                                  <label className="mnx-label block">Payment Date *</label>
                                  <DateInput
                                    required
                                    value={payDate}
                                    onChange={(e) => setPayDate(e.target.value)}
                                    className="h-11 w-full text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="mnx-label block">Disbursement Method *</label>
                                  <NativeSelect
                                    value={payMethod}
                                    onChange={(e) => setPayMethod(e.target.value)}
                                    className="h-11 w-full text-xs"
                                  >
                                    <option value="BANK_TRANSFER">IMPS / Bank Transfer</option>
                                    <option value="NEFT">NEFT / RTGS</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CASH">Office Cash Drawer</option>
                                  </NativeSelect>
                                </div>
                                <div>
                                  <label className="mnx-label block">Txn Reference ID *</label>
                                  <Input
                                    type="text"
                                    required
                                    placeholder="Reference ref code"
                                    value={payRef}
                                    onChange={(e) => setPayRef(e.target.value)}
                                    className="h-11 w-full text-xs"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <FileUploadField
                                    id={`payment-proof-${req.id}`}
                                    label="Payment Proof *"
                                    accept="image/*,application/pdf"
                                    multiple
                                    compact
                                    triggerText="Drag and drop payment proofs, or choose files"
                                    helperText="Images and PDFs accepted. Multiple files can be selected together."
                                    selectedFiles={payProofFiles.map((file) => ({
                                      file,
                                      name: file.name,
                                      sizeBytes: file.size,
                                    }))}
                                    uploading={loading === `pay-${req.id}`}
                                    onInputChange={(event) => setPayProofFiles(Array.from(event.currentTarget.files || []))}
                                    onClear={() => setPayProofFiles([])}
                                    onRemoveSelectedFile={(_, index) =>
                                      setPayProofFiles((current) => current.filter((__, fileIndex) => fileIndex !== index))
                                    }
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPayRequestId(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={loading !== null}>
                                  Confirm Disbursement
                                </Button>
                              </div>
                            </form>
                          ) : null}
                          </div>
                        </aside>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    <Modal
      open={Boolean(activeRoutePlannerRow)}
      title="Route Planner"
      description="Enter From, To, and optional stops. Capture KM with free OSRM routing, or open Google Maps for manual KM evidence."
      onClose={() => setRoutePlannerRowId(null)}
      className="max-w-7xl"
    >
      {activeRoutePlannerRow ? renderRoutePlanner(activeRoutePlannerRow) : null}
    </Modal>
    </>
  );
}
