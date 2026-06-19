import React from "react";
import { Mail, MessageSquare, Send, Bell, Users, ShieldAlert, Sparkles, Plus } from "lucide-react";

export default function CommunicationDashboardPage() {
  const stats = [
    { label: "Active Threads", value: "24", icon: MessageSquare, color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/10" },
    { label: "Sent Emails", value: "1,420", icon: Mail, color: "text-[#00cec4]", bg: "bg-[#00cec4]/10" },
    { label: "Active Broadcasts", value: "3", icon: Bell, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
    { label: "Total Recipients", value: "152", icon: Users, color: "text-[#818cf8]", bg: "bg-[#818cf8]/10" }
  ];

  const recentChats = [
    { name: "John Arputharaj", role: "Logistics Exec", message: "Biometric register upload completed.", time: "10 mins ago", unread: true },
    { name: "Babyshalini K", role: "HR Administrator", message: "Reviewers confirmation deadline set to Monday.", time: "1 hr ago", unread: false },
    { name: "Kirubakari S", role: "Manager", message: "Quotation approval released for invoice #1042.", time: "3 hrs ago", unread: false },
    { name: "Abhilash D", role: "TL", message: "Shift schedule adjustments mapped.", time: "Yesterday", unread: false }
  ];

  const recentBroadcasts = [
    { title: "Fiscal Year 2026 Appraisal Cycle Kickoff", date: "June 18, 2026", author: "Babyshalini K", category: "AMS Cycle" },
    { title: "New Biometric Check-In Policy Rules", date: "June 14, 2026", author: "System Administrator", category: "Attendance Sync" },
    { title: "System Maintenance Notice: Database Optimization", date: "June 10, 2026", author: "DevOps", category: "Monolith Core" }
  ];

  return (
    <div className="py-6 px-4 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 shadow-sm">
        <div>
          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">
            ENTERPRISE COMMUNICATIONS INTERFACE
          </span>
          <h1 className="ds-h1 text-white text-2xl font-bold mt-1 uppercase">
            Communication Portal
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
            Manage company email broadcasts, internal chat threads, and operational notification feeds.
          </p>
        </div>
        <button className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 cursor-pointer">
          <Plus size={14} />
          Create Broadcast
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card-top-accent bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 relative overflow-hidden">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.bg}`}>
                <Icon className={`size-5 ${stat.color}`} strokeWidth={1.8} />
              </div>
              <p className="mt-4 text-[2rem] font-sans font-extralight leading-none tracking-tight text-white ds-numeric">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)] uppercase tracking-wider text-[10px] font-bold">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Recent Messages */}
        <div className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--color-outline-variant)] pb-3">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <MessageSquare size={16} className="text-[#00cec4]" />
              Internal Threads
            </h3>
            <span className="text-[10px] font-mono text-[#00cec4] bg-[#00cec4]/10 px-2 py-0.5 rounded font-bold uppercase">
              Live Connection
            </span>
          </div>

          <div className="divide-y divide-[var(--color-outline-variant)]/60">
            {recentChats.map((chat, idx) => (
              <div key={idx} className="py-3.5 flex justify-between items-start gap-4 hover:bg-[var(--color-surface-container-low)]/50 px-2 rounded-xl transition-all cursor-pointer">
                <div className="flex gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-slate-800 border border-[var(--color-outline-variant)] flex items-center justify-center font-bold text-xs text-white shrink-0">
                    {chat.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-bold font-sans">{chat.name}</span>
                      <span className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-wider font-semibold">
                        {chat.role}
                      </span>
                    </div>
                    <p className="text-[var(--color-on-surface-variant)] text-xs truncate mt-0.5">
                      {chat.message}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                  <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">{chat.time}</span>
                  {chat.unread && (
                    <span className="h-2 w-2 rounded-full bg-[#00cec4] shadow-[0_0_8px_#00cec4]"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Corporate Announcements */}
        <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--color-outline-variant)] pb-3">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Bell size={16} className="text-orange-400" />
              Corporate Announcements
            </h3>
          </div>

          <div className="space-y-4">
            {recentBroadcasts.map((br, idx) => (
              <div key={idx} className="card-left-accent-orange bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 rounded-xl p-4 space-y-2 hover:border-orange-400/40 transition-all">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-400/25 text-[8px] font-mono font-bold tracking-widest uppercase">
                    {br.category}
                  </span>
                  <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">{br.date}</span>
                </div>
                <h4 className="text-white font-bold text-xs font-sans tracking-wide leading-snug">
                  {br.title}
                </h4>
                <div className="text-[9px] text-[var(--color-on-surface-variant)] flex items-center gap-1.5 pt-1">
                  <span>Author:</span>
                  <span className="text-white font-semibold">{br.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
