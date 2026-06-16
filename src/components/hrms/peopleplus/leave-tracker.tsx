"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Search, Plus, Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";

interface LeaveTrackerProps {
  onFetchHolidays?: () => Promise<any[]>;
}

export function LeaveTracker({ onFetchHolidays }: LeaveTrackerProps) {
  const [activeTab, setActiveTab] = useState<"mydata" | "team" | "holidays">("mydata");
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Holiday filters
  const [locationFilter, setLocationFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");

  const [dateRange, setDateRange] = useState("01-Jan-2026 - 31-Dec-2026");

  // Summary Leave Types
  const leaveTypes = [
    { name: "Compensatory Off", available: 0, booked: 0, color: "text-[#00c4b6] bg-[#00c4b6]/10" },
    { name: "Leaves Without Pay", available: 2, booked: 0, color: "text-[#6366f1] bg-[#6366f1]/10" },
    { name: "Paternity Leave", available: 5, booked: 0, color: "text-[#ec4899] bg-[#ec4899]/10" },
    { name: "Sick Leave", available: 2, booked: 0, color: "text-[#f59e0b] bg-[#f59e0b]/10" },
    { name: "Unscheduled holiday", available: 0, booked: 0, color: "text-[#3b82f6] bg-[#3b82f6]/10" },
    { name: "Vacation Leave", available: 0, booked: 0, color: "text-[#10b981] bg-[#10b981]/10" },
    { name: "WFH", available: 52, booked: 0, color: "text-[#8b5cf6] bg-[#8b5cf6]/10" }
  ];

  // Absent days matching Doc1.pdf
  const absentDays = [
    { date: "15-Jun-2026, Monday", duration: "0.5 day" },
    { date: "10-Jun-2026, Wednesday", duration: "0.5 day" },
    { date: "04-Jun-2026, Thursday", duration: "0.5 day" },
    { date: "01-Jun-2026, Monday", duration: "1 day" }
  ];

  // Static description map for seeded holidays (from Doc1.pdf page 2)
  const holidayDescriptions: Record<string, string> = {
    "NEW YEAR": "Celebration marking the beginning of the New Year, observed as a day of new beginnings and fresh resolutions.",
    "PONGAL": "A traditional harvest festival of Tamil Nadu celebrated to thank nature, the sun god, and farmers for agricultural prosperity.",
    "PONGAL (DAY 2)": "Continuation of the Pongal harvest festival celebration.",
    "REPUBLIC DAY": "Celebrates India's independence from British rule on 15 August 1947.",
    "IDU'L FITR (RAMZAN)": "Marks the end of the holy month of Ramadan, celebrated with prayers, charity, and community gatherings.",
    "MAHAVIR JAYANTHI": "Celebrates the birth of Lord Mahavir, the 24th Tirthankara of Jainism, emphasizing peace, non-violence, and truth.",
    "GOOD FRIDAY": "Observed by Christians to commemorate the crucifixion of Jesus Christ and his sacrifice for humanity.",
    "Ambedkar Birthday": "Marks the birth anniversary of Dr. B. R. Ambedkar, father of the Indian Constitution.",
    "Election Day": "State legislative or national voting holiday.",
    "BUDDHA PURNIMA": "Celebrates the birth, enlightenment, and death of Lord Buddha, founder of Buddhism.",
    "IDU'L ZUHA (BAKRID)": "Also known as Eid al-Adha, it commemorates the devotion and sacrifice of Prophet Ibrahim.",
    "MUHARRAM": "The first month of the Islamic calendar, observed as a day of remembrance and mourning, especially by the Shia community.",
    "INDEPENDENCE DAY": "Celebrates India's independence from British rule on 15 August 1947.",
    "PROPHET MOHAMMAD'S BIRTHDAY": "Marks the birth of Prophet Mohammad, observed with prayers, religious discussions, and acts of charity.",
    "VINAYAGAR CHATHURTHI": "Celebrates the birth of Lord Ganesha, the remover of obstacles and the god of wisdom and prosperity.",
    "MAHATMA GANDHI'S BIRTHDAY": "Celebrates the birth anniversary of Mahatma Gandhi, leader of Indian independence movement.",
    "AYUTHA POOJA": "Pooja dedicated to tools and equipment, expressing gratitude for livelihood.",
  };

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/dashboard");
      const json = await res.json();
      if (json.ok && json.data.upcomingHolidays) {
        // Fetch all holidays in a year for comprehensive view
        const year = 2026;
        const allRes = await fetch(`/api/hrms/peopleplus/attendance/month?year=${year}&month=1`);
        // Just mock some extra locations and shifts details on the holiday data returned
        const list = json.data.upcomingHolidays.map((h: any) => {
          const name = h.name;
          const isChennaiSpecific = name.toLowerCase().includes("ambedkar") || name.toLowerCase().includes("election");
          return {
            ...h,
            location: isChennaiSpecific ? "Chennai" : "All Locations",
            shifts: isChennaiSpecific ? "General" : "All Shifts",
            classification: "Holiday",
            description: holidayDescriptions[name] || "Public corporate holiday."
          };
        });
        setHolidays(list);
      }
    } catch (err) {
      toast.error("Failed to load holiday roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const handleApplyLeave = (dateStr: string) => {
    toast.success(`Applying leave for ${dateStr}`);
  };

  // Filter holidays based on dropdown selections
  const filteredHolidays = holidays.filter((h) => {
    if (locationFilter !== "All" && h.location !== locationFilter) return false;
    if (shiftFilter !== "All" && h.shifts !== shiftFilter) return false;
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none">
      {/* Primary Tab Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("mydata")}
            className={`text-xs font-bold pb-2 pt-1 border-b-2 cursor-pointer transition-all ${
              activeTab === "mydata"
                ? "border-[#00c4b6] text-[#00c4b6]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            My Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`text-xs font-bold pb-2 pt-1 border-b-2 cursor-pointer transition-all ${
              activeTab === "team"
                ? "border-[#00c4b6] text-[#00c4b6]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Team
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("holidays")}
            className={`text-xs font-bold pb-2 pt-1 border-b-2 cursor-pointer transition-all ${
              activeTab === "holidays"
                ? "border-[#00c4b6] text-[#00c4b6]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Holidays
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1">
        {activeTab === "mydata" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {leaveTypes.map((type) => (
                <div key={type.name} className="border border-slate-100 bg-slate-50/30 p-4 rounded-xl flex flex-col justify-between h-24 shadow-sm">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`size-2.5 rounded-full shrink-0 ${type.color.split(" ")[0]}`} />
                    <span className="text-[10px] text-slate-500 font-bold truncate max-w-full" title={type.name}>
                      {type.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <span className="text-sm font-extrabold text-slate-800 leading-none block">{type.available}</span>
                      <span className="text-[8.5px] text-slate-400 font-semibold uppercase leading-none block mt-1">Available</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 leading-none block">{type.booked}</span>
                      <span className="text-[8.5px] text-slate-400 font-semibold uppercase leading-none block mt-1">Booked</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* LOP Absent Days List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Absent &bull; <span className="text-rose-500 font-extrabold">9.5 days</span>
              </h4>
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-150">
                {absentDays.map((day) => (
                  <div key={day.date} className="flex justify-between items-center px-6 py-3.5 bg-white">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-slate-700">{day.date}</span>
                      <span className="text-[10.5px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-bold">{day.duration}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyLeave(day.date)}
                      className="text-[10.5px] font-bold text-[#00c4b6] border border-[#00c4b6]/20 bg-[#00c4b6]/5 hover:bg-[#00c4b6]/10 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Apply Leave
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Leaves & Holidays list snippet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Upcoming Leaves & Holidays</h5>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-semibold">MUHARRAM</span>
                    <span className="text-slate-400 font-medium">26-Jun-2026, Friday</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-semibold">INDEPENDENCE DAY</span>
                    <span className="text-slate-400 font-medium">15-Aug-2026, Saturday</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Past Leaves & Holidays</h5>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-semibold">IDUL ZUHA (BAKRID)</span>
                    <span className="text-slate-400 font-medium">28-May-2026, Thursday</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-semibold">Vacation Leave (6 days)</span>
                    <span className="text-emerald-500 font-bold">Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold animate-in fade-in duration-200">
            No direct team leave records logged.
          </div>
        )}

        {activeTab === "holidays" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Table Filters Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
              {/* Date/Cal Range display */}
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[#00c4b6]" />
                <span className="text-xs font-bold text-slate-700">{dateRange}</span>
              </div>

              {/* Filters dropdown lists */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location:</span>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1 outline-none"
                  >
                    <option value="All">All Locations</option>
                    <option value="Chennai">Chennai</option>
                    <option value="All Locations">All Locations</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Shifts:</span>
                  <select
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1 outline-none"
                  >
                    <option value="All">All Shifts</option>
                    <option value="General">General</option>
                    <option value="All Shifts">All Shifts</option>
                  </select>
                </div>

                {/* Add Holidays option */}
                <button
                  type="button"
                  className="bg-[#00c4b6] hover:bg-[#00b0a3] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer ml-auto sm:ml-0"
                >
                  <Plus className="size-3.5" />
                  Add Holidays
                </button>
              </div>
            </div>

            {/* Holidays Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3">Holiday Name</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Shifts</th>
                    <th className="px-6 py-3">Classification</th>
                    <th className="px-6 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">Syncing holiday roster...</td>
                    </tr>
                  ) : filteredHolidays.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No holidays match the active location/shift filters.</td>
                    </tr>
                  ) : (
                    filteredHolidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{h.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {new Date(h.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "2-digit"
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10.5px] ${
                            h.location === "Chennai"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {h.location}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-500 font-semibold">{h.shifts}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 font-bold uppercase text-[9.5px] tracking-wider">{h.classification}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-medium leading-relaxed max-w-sm">
                          {h.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
