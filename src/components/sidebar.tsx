"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo } from "react";
import { Logout, Notification, UserAvatar } from "@carbon/icons-react";
import type { Caps } from "@/lib/rbac";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";

function BrandLogo() {
  return (
    <div className="mb-2 flex w-full items-center justify-center px-4 py-5">
      <Image
        src="/Logo.png"
        alt="Adarsh Shipping & Services"
        width={210}
        height={72}
        className="h-auto w-full max-w-[210px] object-contain"
      />
    </div>
  );
}

export function Sidebar({ caps, userName }: { caps: Caps; userName: string }) {
  const pathname = usePathname();
  const visibleSections = useMemo(() => getVisibleSections(caps), [caps]);

  const activeSectionId =
    visibleSections.find((section) => matchesPath(pathname, section.href, section.matchPaths))?.id ??
    visibleSections[0]?.id ??
    "dashboard";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-[#1e2024] bg-[#1e2024]">
      <BrandLogo />

      <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {visibleSections.map((section) => {
          const isActive = section.id === activeSectionId;
          const Icon = section.icon;
          const activeChildHref = getActiveItemHref(pathname, section.items);

          return (
            <div key={section.id} className="space-y-1">
              <Link
                href={section.href}
                className={`group relative flex w-full items-center rounded-md px-3 py-2.5 transition-all duration-300 ${
                  isActive
                    ? "bg-[#2A313A] text-[#00A89D]"
                    : "text-white/80 hover:bg-[#252B32] hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform duration-300 ${
                    isActive
                      ? "scale-110 text-[#00A89D]"
                      : "text-white/80 group-hover:scale-110 group-hover:text-white"
                  }`}
                />
                <span className="ml-3 font-medium text-[13px] tracking-wide">{section.label}</span>

                {isActive && (
                  <div className="absolute bottom-0 right-0 top-0 w-1 animate-[fade-in_0.3s_ease-out] rounded-l-md bg-[#F47920]" />
                )}
              </Link>

              {isActive && section.items.length > 0 && (
                <div className="ml-4 space-y-1 border-l border-[#2C333A] pl-3">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isChildActive = activeChildHref === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group relative flex items-center rounded-md px-3 py-2 text-[12px] transition-all duration-300 ${
                          isChildActive
                            ? "bg-[#252B32] text-[#F6F7F9]"
                            : "text-white/65 hover:bg-[#22282F] hover:text-white"
                        }`}
                      >
                        <div
                          className={`absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                            isChildActive ? "bg-[#00A89D] shadow-[0_0_0_3px_rgba(0,168,157,0.16)]" : "bg-white/20 group-hover:bg-white/45"
                          }`}
                        />
                        <ItemIcon
                          size={15}
                          className={`shrink-0 transition-transform duration-300 ${
                            isChildActive ? "text-[#00A89D]" : "group-hover:scale-110"
                          }`}
                        />
                        <span className="ml-3 pl-2 font-medium tracking-wide">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto w-full shrink-0 px-3 pb-8 pt-3">
        <div className="mb-2 rounded-md border border-[#2C333A] bg-[#1F252C] px-3 py-2">
          <div className="truncate text-[12px] font-medium tracking-wide text-white/90">{userName}</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#00A89D]">Workspace member</div>
        </div>
        <div className="flex flex-col gap-1">
          <Link
            href="/notifications"
            className="group flex w-full items-center rounded-md px-3 py-2.5 text-white/80 transition-all duration-300 hover:bg-[#252B32] hover:text-white"
          >
            <Notification size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-white" />
            <span className="ml-3 font-medium text-[13px] tracking-wide">Notifications</span>
          </Link>
          <Link
            href="/profile"
            className="group flex w-full items-center rounded-md px-3 py-2.5 text-white/80 transition-all duration-300 hover:bg-[#252B32] hover:text-white"
          >
            <UserAvatar size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-white" />
            <span className="ml-3 font-medium text-[13px] tracking-wide">Profile</span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="group flex w-full items-center rounded-md px-3 py-2.5 text-white/80 transition-all duration-300 hover:bg-[#252B32] hover:text-white"
          >
            <Logout size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-white" />
            <span className="ml-3 font-medium text-[13px] tracking-wide">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
