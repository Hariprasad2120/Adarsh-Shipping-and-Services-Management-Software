"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Mail, 
  MessageSquare, 
  Layers, 
  Video, 
  Calendar, 
  HardDrive, 
  Search, 
  Settings,
  FlaskConical
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  matchExact?: boolean;
  experimental?: boolean;
}

// Base nav items — Chat tab and all existing items are unchanged
const BASE_NAV_ITEMS: NavItem[] = [
  { label: "Workspace Home", href: "/communication", icon: Home, matchExact: true },
  { label: "Mail", href: "/communication/mail", icon: Mail },
  { label: "Chat", href: "/communication/chat", icon: MessageSquare },
  // NOTE: "Google Chat Live View" is inserted here conditionally — see below
  { label: "Job Spaces", href: "/communication/job-spaces", icon: Layers },
  { label: "Meetings", href: "/communication/meetings", icon: Video },
  { label: "Calendar", href: "/communication/calendar", icon: Calendar },
  { label: "Job Drive", href: "/communication/drive", icon: HardDrive },
  { label: "Search", href: "/communication/search", icon: Search },
  { label: "Settings", href: "/communication/settings", icon: Settings },
];

// Experimental Live View tab — only injected when feature toggle is ON
const LIVE_VIEW_TAB: NavItem = {
  label: "Google Chat Live View",
  href: "/communication/google-chat-live-view",
  icon: FlaskConical,
  experimental: true,
};

interface CommunicationNavbarProps {
  /** When true, the Google Chat Live View experimental tab is shown between Chat and Job Spaces */
  showGoogleChatLiveView?: boolean;
}

export default function CommunicationNavbar({ showGoogleChatLiveView = false }: CommunicationNavbarProps) {
  const pathname = usePathname();

  // Build the nav item list: insert Live View tab after Chat (index 2) only when enabled
  const navItems: NavItem[] = showGoogleChatLiveView
    ? [
        ...BASE_NAV_ITEMS.slice(0, 3), // Home, Mail, Chat
        LIVE_VIEW_TAB,
        ...BASE_NAV_ITEMS.slice(3),    // Job Spaces → Settings
      ]
    : BASE_NAV_ITEMS;

  return (
    <div className="sticky top-0 z-20 flex items-center w-full border border-outline-variant bg-surface/85 backdrop-blur-md px-4 py-1.5 rounded-2xl shadow-sm mb-6 overflow-x-auto scrollbar-none">
      <div className="flex items-center space-x-1.5 min-w-max py-1">
        {navItems.map((item) => {
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 group ${
                isActive
                  ? "bg-[#00cec4]/10 text-[#00cec4] shadow-[0_2px_10px_-3px_rgba(0,206,196,0.15)]"
                  : "text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container/60"
              }`}
            >
              <Icon 
                size={14} 
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-[#00cec4]" : "text-on-surface-variant group-hover:text-[#00cec4]"
                }`} 
              />
              <span>{item.label}</span>

              {/* Experimental badge — small dot indicator */}
              {item.experimental && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#fb923c] shrink-0" title="Experimental feature" />
              )}
              
              {isActive && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#00cec4] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
