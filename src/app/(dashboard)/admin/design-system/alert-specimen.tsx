"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";

type AlertVariant = "info" | "success" | "warning" | "destructive";

type AlertSpecItem = {
  body: string;
  icon: LucideIcon;
  title: string;
  variant: AlertVariant;
};

const alertSpec: AlertSpecItem[] = [
  {
    variant: "info",
    icon: Info,
    title: "Info",
    body: "Neutral, informational callout for context or tips.",
  },
  {
    variant: "success",
    icon: CheckCircle2,
    title: "Success",
    body: "Confirms a completed action, such as a saved record.",
  },
  {
    variant: "warning",
    icon: AlertTriangle,
    title: "Warning",
    body: "Flags something that needs attention before continuing.",
  },
  {
    variant: "destructive",
    icon: XCircle,
    title: "Destructive",
    body: "Blocking error or the consequence of a destructive action.",
  },
];

export function AlertSpecimen() {
  const [visibleAlerts, setVisibleAlerts] = useState(alertSpec);

  return (
    <section className="ds-alert-stack" aria-label="Alert variants">
      {visibleAlerts.map((spec) => {
        const Icon = spec.icon;

        return (
          <Alert
            close
            variant={spec.variant}
            key={spec.variant}
            onClose={() =>
              setVisibleAlerts((current) =>
                current.filter((item) => item.variant !== spec.variant),
              )
            }
          >
            <AlertIcon>
              <Icon size={16} aria-hidden="true" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>{spec.title}</AlertTitle>
              <AlertDescription>{spec.body}</AlertDescription>
            </AlertContent>
          </Alert>
        );
      })}
    </section>
  );
}
