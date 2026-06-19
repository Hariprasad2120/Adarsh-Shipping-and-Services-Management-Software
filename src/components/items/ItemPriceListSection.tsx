"use client";

import React, { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Plus, Check, RefreshCw } from "lucide-react";
import type { ItemFormSchema } from "@/lib/items/validation";
import {
  getCurrencies,
  saveCurrency,
  isAutoExchangeRateEnabled,
  setAutoExchangeRateEnabled,
  fetchOnlineRates,
  type CurrencyInfo,
} from "@/lib/items/currency-store";

type ItemPriceListSectionProps = {
  form: UseFormReturn<ItemFormSchema>;
};

export function ItemPriceListSection({ form }: ItemPriceListSectionProps) {
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [autoFeed, setAutoFeed] = useState(true);
  const [onlineRates, setOnlineRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(false);

  // Custom currency form state
  const [newCode, setNewCode] = useState("");
  const [newRate, setNewRate] = useState("");

  const sellingPrice = form.watch("sellingPrice") ?? 0;
  const formPriceList = form.watch("priceList") ?? [];

  // Load currencies and preference on mount
  useEffect(() => {
    setCurrencies(getCurrencies());
    const isAuto = isAutoExchangeRateEnabled();
    setAutoFeed(isAuto);
    form.setValue("priceListAuto", isAuto);
  }, [form]);

  // Fetch online rates if autoFeed is enabled
  useEffect(() => {
    if (!autoFeed) return;

    let active = true;
    const loadRates = async () => {
      setLoadingRates(true);
      try {
        const rates = await fetchOnlineRates();
        if (active) {
          setOnlineRates(rates);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingRates(false);
      }
    };

    loadRates();
    return () => {
      active = false;
    };
  }, [autoFeed]);

  // Sync price list values when currencies or sellingPrice or onlineRates change
  useEffect(() => {
    if (currencies.length === 0) return;

    const currentList = [...formPriceList];
    let changed = false;

    currencies.forEach((c) => {
      if (c.code === "INR") return; // INR is the base

      const existingIdx = currentList.findIndex((item) => item.currency === c.code);
      const suggestedRate = onlineRates[c.code] ?? c.exchangeRate;
      const finalRate = autoFeed ? suggestedRate : (currentList[existingIdx]?.exchangeRate ?? c.exchangeRate);

      if (existingIdx === -1) {
        // Add new currency to form list
        currentList.push({
          currency: c.code,
          exchangeRate: finalRate,
          customPrice: parseFloat((sellingPrice / finalRate).toFixed(2)),
          useAutomatic: autoFeed,
        });
        changed = true;
      } else {
        const item = currentList[existingIdx];
        let itemChanged = false;

        // If autoFeed is toggled, update rates to suggested
        if (autoFeed && item.exchangeRate !== suggestedRate) {
          item.exchangeRate = suggestedRate;
          item.useAutomatic = true;
          itemChanged = true;
        }

        // Recalculate price if base price changed and user hasn't modified it manually (or just recalculate default)
        const expectedPrice = parseFloat((sellingPrice / item.exchangeRate).toFixed(2));
        if (item.customPrice === undefined || isNaN(item.customPrice) || sellingPrice > 0 && !item.customPrice) {
          item.customPrice = expectedPrice;
          itemChanged = true;
        }

        if (itemChanged) {
          currentList[existingIdx] = { ...item };
          changed = true;
        }
      }
    });

    if (changed) {
      form.setValue("priceList", currentList, { shouldDirty: true });
    }
  }, [currencies, sellingPrice, onlineRates, autoFeed, form]);

  const handleToggleAutoFeed = () => {
    const nextVal = !autoFeed;
    setAutoFeed(nextVal);
    setAutoExchangeRateEnabled(nextVal);
    form.setValue("priceListAuto", nextVal);

    if (nextVal) {
      // Update form values with suggested rates immediately if they exist
      const updatedList = formPriceList.map((item) => {
        const suggestedRate = onlineRates[item.currency];
        if (suggestedRate) {
          return {
            ...item,
            exchangeRate: suggestedRate,
            customPrice: parseFloat((sellingPrice / suggestedRate).toFixed(2)),
            useAutomatic: true,
          };
        }
        return item;
      });
      form.setValue("priceList", updatedList, { shouldDirty: true });
    }
  };

  const handleRateChange = (code: string, newRateVal: number) => {
    const updatedList = formPriceList.map((item) => {
      if (item.currency === code) {
        return {
          ...item,
          exchangeRate: newRateVal,
          customPrice: parseFloat((sellingPrice / newRateVal).toFixed(2)),
          useAutomatic: false,
        };
      }
      return item;
    });
    form.setValue("priceList", updatedList, { shouldDirty: true });
  };

  const handlePriceChange = (code: string, newPriceVal: number) => {
    const updatedList = formPriceList.map((item) => {
      if (item.currency === code) {
        return {
          ...item,
          customPrice: newPriceVal,
        };
      }
      return item;
    });
    form.setValue("priceList", updatedList, { shouldDirty: true });
  };

  const handleAddCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    const rate = parseFloat(newRate);

    if (!code || code.length !== 3) {
      alert("Currency code must be exactly 3 letters.");
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      alert("Please enter a valid positive exchange rate.");
      return;
    }

    if (currencies.some((c) => c.code === code)) {
      alert(`Currency ${code} already exists.`);
      return;
    }

    const newCurr: CurrencyInfo = {
      code,
      symbol: code,
      exchangeRate: rate,
    };

    saveCurrency(newCurr);
    setCurrencies(getCurrencies());

    setNewCode("");
    setNewRate("");
  };

  return (
    <div className="ds-form-section space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="ds-h3 font-sans">Price List & Multi-Currency</h3>
        <button
          type="button"
          onClick={handleToggleAutoFeed}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-[#00cec4]/20 ${
            autoFeed ? "bg-[#00cec4]" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoFeed ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#6b7280]">
        <span>Automatic exchange rate suggestion from online API is</span>
        <span className={`font-semibold ${autoFeed ? "text-[#00cec4]" : "text-gray-500"}`}>
          {autoFeed ? "ON" : "OFF"}
        </span>
        {loadingRates && (
          <RefreshCw className="size-3 animate-spin text-[#00cec4] ml-1" />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#374151]">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              <th className="pb-2">Currency</th>
              <th className="pb-2">Exchange Rate (1 Foreign Unit = X INR)</th>
              <th className="pb-2 text-right">Selling Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            <tr className="bg-gray-50/50">
              <td className="py-2.5 font-semibold text-gray-900">INR (Base)</td>
              <td className="py-2.5 text-gray-500 font-mono">1.0000 (Fixed)</td>
              <td className="py-2.5 text-right font-semibold text-gray-900 font-mono">
                ₹ {sellingPrice.toFixed(2)}
              </td>
            </tr>

            {formPriceList.map((item, idx) => {
              const suggested = onlineRates[item.currency];
              return (
                <tr key={item.currency} className="hover:bg-gray-50/50">
                  <td className="py-2.5 font-medium text-gray-900">{item.currency}</td>
                  <td className="py-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        className="h-8 w-28 rounded-xl border bg-white px-2 text-xs font-mono outline-none"
                        value={item.exchangeRate}
                        onChange={(e) => handleRateChange(item.currency, parseFloat(e.target.value) || 1)}
                        disabled={autoFeed && !!suggested}
                      />
                      {autoFeed && suggested && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="size-3" /> Auto
                        </span>
                      )}
                    </div>
                    {suggested && (
                      <div className="text-[10px] text-gray-400">
                        Suggested rate: <span className="font-mono">{suggested.toFixed(4)}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 font-medium">{item.currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-24 rounded-xl border bg-white px-2 text-right text-xs font-mono outline-none font-semibold text-gray-900"
                        value={item.customPrice ?? ""}
                        onChange={(e) => handlePriceChange(item.currency, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-dashed border-[#e5e7eb] pt-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Add New Currency</h4>
        <form onSubmit={handleAddCurrency} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Code</label>
            <input
              type="text"
              placeholder="e.g. USD"
              maxLength={3}
              className="h-8 w-20 rounded-xl border bg-white px-2 text-xs uppercase outline-none"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Exchange Rate (INR)</label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              placeholder="e.g. 83.5"
              className="h-8 w-28 rounded-xl border bg-white px-2 text-xs outline-none font-mono"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#00cec4] px-3 text-xs font-semibold text-white transition-all hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]"
          >
            <Plus className="size-3.5" /> Add
          </button>
        </form>
      </div>
    </div>
  );
}
