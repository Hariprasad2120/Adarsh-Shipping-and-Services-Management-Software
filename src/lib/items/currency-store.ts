export type CurrencyInfo = {
  code: string;
  symbol: string;
  exchangeRate: number; // 1 Currency unit = X INR
};

const STORAGE_KEY = "crm_currencies";
const TOGGLE_KEY = "crm_auto_exchange_rate";

const BASIC_CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", exchangeRate: 1.0 },
  { code: "USD", symbol: "$", exchangeRate: 83.50 },
  { code: "EUR", symbol: "€", exchangeRate: 90.20 },
  { code: "GBP", symbol: "£", exchangeRate: 106.10 },
];

export function getCurrencies(): CurrencyInfo[] {
  if (typeof window === "undefined") return BASIC_CURRENCIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BASIC_CURRENCIES;
    const custom = JSON.parse(raw) as CurrencyInfo[];
    const merged = [...BASIC_CURRENCIES];
    custom.forEach((c) => {
      if (!merged.some((m) => m.code === c.code)) {
        merged.push(c);
      }
    });
    return merged;
  } catch {
    return BASIC_CURRENCIES;
  }
}

export function saveCurrency(currency: CurrencyInfo): void {
  if (typeof window === "undefined") return;
  try {
    const custom = getCurrencies().filter(c => !BASIC_CURRENCIES.some(b => b.code === c.code));
    const idx = custom.findIndex((c) => c.code === currency.code);
    if (idx > -1) {
      custom[idx] = currency;
    } else {
      custom.push(currency);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error("Failed to save currency", e);
  }
}

export function isAutoExchangeRateEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(TOGGLE_KEY);
  return val !== "false";
}

export function setAutoExchangeRateEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOGGLE_KEY, String(enabled));
}

export async function fetchOnlineRates(): Promise<Record<string, number>> {
  try {
    // Fetch rates base INR (value represents units of currency per 1 INR)
    const res = await fetch("https://open.er-api.com/v6/latest/INR");
    if (!res.ok) throw new Error("Failed to fetch rates");
    const data = await res.json();
    const result: Record<string, number> = {};
    if (data && data.rates) {
      for (const [code, value] of Object.entries(data.rates)) {
        if (typeof value === "number" && value > 0) {
          // Convert to "how many INR is 1 unit of this currency"
          result[code] = parseFloat((1 / value).toFixed(4));
        }
      }
    }
    return result;
  } catch (e) {
    console.error("Error fetching rates online:", e);
    return {};
  }
}
