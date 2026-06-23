import React from "react";
import { Mail, MessageSquare, Send, Bell, Users, Plus, Calendar, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function CommunicationDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  const userId = session.user.id;

  // Fetch real counts from DB
  const [
    chatThreadsCount,
    emailsCount,
    eventsCount,
    filesCount,
    recentChatsData,
    recentBroadcastsData,
  ] = await Promise.all([
    db.chatConversation.count({ where: { orgId } }),
    db.mailMessage.count({ where: { orgId } }),
    db.calendarEvent.count({ where: { orgId } }),
    db.fileAsset.count({ where: { orgId } }),
    db.chatMessage.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        sender: { select: { name: true } },
        conversation: { select: { name: true, type: true } },
      },
    }),
    db.notification.findMany({
      where: { orgId },
      orderBy: { lastSentAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        body: true,
        lastSentAt: true,
        kind: true,
      },
    }),
  ]);

  const stats = [
    { label: "Active Chat Rooms", value: String(chatThreadsCount), icon: MessageSquare, color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/10" },
    { label: "Email Messages", value: String(emailsCount), icon: Mail, color: "text-[#00cec4]", bg: "bg-[#00cec4]/10" },
    { label: "Calendar Events", value: String(eventsCount), icon: Calendar, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Drive Storage Files", value: String(filesCount), icon: FileText, color: "text-[#22c55e]", bg: "bg-[#22c55e]/10" },
  ];

  // Helper for displaying time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

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
            Manage company email, real-time chats, planning schedules, and operational notification feeds.
          </p>
        </div>
        <a 
          href="/communication/mail?compose=true"
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold flex items-center gap-2 cursor-pointer relative transform-gpu transition-all duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_0_#00857e] shadow-[0_6px_0_0_#00857e] border border-[#00b8af]"
        >
          <Plus size={14} />
          Compose Mail
        </a>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card-top-accent bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 relative overflow-hidden hover:scale-[1.03] hover:shadow-lg transition-transform duration-200">
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
          <div className="flex justify-between items-center border-b border-[var(--color-outline-variant)]/60 pb-3">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <MessageSquare size={16} className="text-[#00cec4]" />
              Internal Live Chat
            </h3>
            <span className="text-[10px] font-mono text-[#00cec4] bg-[#00cec4]/10 px-2 py-0.5 rounded font-bold uppercase">
              Live Connection
            </span>
          </div>

          <div className="divide-y divide-[var(--color-outline-variant)]/60">
            {recentChatsData.map((chat) => (
              <a
                key={chat.id}
                href={`/communication/chat?id=${chat.conversationId}`}
                className="py-3.5 flex justify-between items-start gap-4 hover:bg-[var(--color-surface-container-low)]/70 hover:translate-x-1.5 px-2 rounded-xl transition-all duration-150 cursor-pointer block"
              >
                <div className="flex gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-slate-800 border border-[var(--color-outline-variant)] flex items-center justify-center font-bold text-xs text-white shrink-0">
                    {chat.sender.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-bold font-sans">{chat.sender.name}</span>
                      <span className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-wider font-semibold">
                        {chat.conversation.name || `${chat.conversation.type} Chat`}
                      </span>
                    </div>
                    <p className="text-[var(--color-on-surface-variant)] text-xs truncate mt-0.5">
                      {chat.body}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                  <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">
                    {formatTimeAgo(chat.createdAt)}
                  </span>
                </div>
              </a>
            ))}
            {recentChatsData.length === 0 && (
              <div className="p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                No recent chat messages found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Corporate Announcements */}
        <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--color-outline-variant)]/60 pb-3">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Bell size={16} className="text-orange-400" />
              Corporate Announcements
            </h3>
          </div>

          <div className="space-y-4">
            {recentBroadcastsData.map((br) => (
              <div key={br.id} className="card-left-accent-orange bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 rounded-xl p-4 space-y-2 hover:border-orange-400/40 hover:scale-[1.01] hover:shadow-md transition-all duration-150">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-400/25 text-[8px] font-mono font-bold tracking-widest uppercase">
                    {br.kind.replace("COMM_", "")}
                  </span>
                  <span className="text-[9px] text-[var(--color-on-surface-variant)] font-mono">
                    {formatTimeAgo(br.lastSentAt || new Date())}
                  </span>
                </div>
                <h4 className="text-white font-bold text-xs font-sans tracking-wide leading-snug">
                  {br.title}
                </h4>
                {br.body && (
                  <p className="text-[var(--color-on-surface-variant)] text-[11px] leading-relaxed">
                    {br.body}
                  </p>
                )}
              </div>
            ))}
            {recentBroadcastsData.length === 0 && (
              <div className="p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                No announcements found.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
