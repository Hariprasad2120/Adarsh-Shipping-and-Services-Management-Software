"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PortalHeaderNav({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/customer-portal/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Customer portal navigation">
      <div className="flex min-w-max items-center justify-start gap-x-10 gap-y-2 lg:justify-center">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "ds-label inline-flex items-center justify-center whitespace-nowrap border-b border-[#00cec4] px-1 pb-1 text-[#00cec4]"
                  : "ds-label inline-flex items-center justify-center whitespace-nowrap border-b border-transparent px-1 pb-1 text-on-surface-variant transition-colors hover:border-[#00cec4]/45 hover:text-[#00cec4]"
              }
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PortalLoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch("/api/customer-portal/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Login failed");
            return;
          }
          router.push("/customer-portal/dashboard");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <label className="ds-label block">Email</label>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </div>
      <div className="space-y-2">
        <label className="ds-label block">Password</label>
        <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing In..." : "Sign In"}
      </Button>
    </form>
  );
}

export function PortalLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch("/api/customer-portal/auth/logout", { method: "POST" });
        router.push("/customer-portal/login");
        router.refresh();
      }}
    >
      Logout
    </Button>
  );
}
