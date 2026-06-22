"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { performLogout } from "@/lib/logout";

export function RootSignOutButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={() => void performLogout()}
      className="uppercase tracking-[0.12em]"
    >
      <LogOut className="mr-2 size-4 text-[#00cec4]" />
      Sign Out
    </Button>
  );
}
