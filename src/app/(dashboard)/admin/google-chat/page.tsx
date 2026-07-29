"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Link2,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminEmptyTableRow,
  AdminErrorState,
  AdminLoadingState,
  AdminPanel,
  AdminPanelHeader,
  AdminTable,
  WorkspaceAlert,
  WorkspaceMetric,
  WorkspaceSectionHeading,
  WorkspaceState,
} from "@/components/monolith";

type LinkedUser = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  designation?: string;
  googleEmail?: string;
  googleDisplayName?: string;
  linkedAt: string;
  lastUsedAt?: string;
  linkStatus: string;
};

type SpaceRecord = {
  id: string;
  spaceResourceName: string;
  displayName?: string;
  spaceType: string;
  linkedRecordLabel?: string;
  linkStatus: string;
  botMember: boolean;
};

type DeliveryStat = { status: string; count: number };

type Delivery = {
  id: string;
  status: string;
  eventKind?: string;
  createdAt: string;
};

type AdminData = {
  linkedUsers: LinkedUser[];
  spaces: SpaceRecord[];
  recentDeliveries: Delivery[];
  pendingDeliveries: number;
  deliveryStats: DeliveryStat[];
  totalLinkedUsers: number;
  totalSpaces: number;
};

type Tab = "users" | "spaces" | "deliveries";

function statusVariant(status: string) {
  if (["sent", "active", "connected"].includes(status)) {
    return "success" as const;
  }
  if (["queued", "processing", "failed_retryable"].includes(status)) {
    return "warning" as const;
  }
  if (["failed_permanent", "failed", "revoked"].includes(status)) {
    return "danger" as const;
  }
  return "neutral" as const;
}

export default function GoogleChatAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/google-chat/admin");
      if (!response.ok) throw new Error(await response.text());
      setData(await response.json());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const isConnected = (data?.totalLinkedUsers ?? 0) > 0;
  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    {
      key: "users",
      label: "Linked users",
      count: data?.totalLinkedUsers ?? 0,
    },
    { key: "spaces", label: "Spaces", count: data?.totalSpaces ?? 0 },
    {
      key: "deliveries",
      label: "Deliveries",
      count: data?.pendingDeliveries ?? 0,
    },
  ];

  return (
    <>
      <section className="mnx-workspace-metrics" aria-label="Google Chat summary">
        <WorkspaceMetric
          icon={isConnected ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          label="Connection"
          value={isConnected ? "Active" : "Not linked"}
          detail="Google Chat app state"
        />
        <WorkspaceMetric
          icon={<Users aria-hidden="true" />}
          label="Linked users"
          value={data?.totalLinkedUsers ?? 0}
          detail="Connected employee accounts"
        />
        <WorkspaceMetric
          icon={<MessageSquare aria-hidden="true" />}
          label="Spaces"
          value={data?.totalSpaces ?? 0}
          detail="Linked Google Chat spaces"
        />
        <WorkspaceMetric
          icon={<Send aria-hidden="true" />}
          label="Pending"
          value={data?.pendingDeliveries ?? 0}
          detail="Queued deliveries"
        />
      </section>

      {!loading && data?.totalLinkedUsers === 0 ? (
        <WorkspaceAlert variant="info">
          <AlertCircle aria-hidden="true" />
          <div>
            <strong>Connect the first user from Google Chat.</strong>
            <p>
              Open Monolith AI Assistant, send a direct message, and follow the
              account-link prompt. The configured webhook endpoint is{" "}
              <code>
                {process.env.NEXT_PUBLIC_WEBHOOK_URL ??
                  "/api/google-chat/webhook"}
              </code>
              .
            </p>
          </div>
        </WorkspaceAlert>
      ) : null}

      <WorkspaceSectionHeading
        index="01"
        title="Integration register"
        description="Inspect linked identities, spaces, and recent delivery outcomes without changing Google Chat workflow state."
      />

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Integration data"
          title={tabs.find((tab) => tab.key === activeTab)?.label ?? "Register"}
          actions={
            <AdminButton onClick={load} disabled={loading} size="compact">
              <RefreshCw
                className={loading ? "mnx-state-spinner" : undefined}
                aria-hidden="true"
              />
              Refresh
            </AdminButton>
          }
        />
        <div className="mnx-admin-tabs" role="tablist" aria-label="Google Chat data">
          {tabs.map((tab) => (
            <AdminButton
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "is-selected" : undefined}
            >
              {tab.label}
              <AdminBadge>{tab.count}</AdminBadge>
            </AdminButton>
          ))}
        </div>

        {error ? (
          <AdminErrorState description={error} onRetry={load} />
        ) : loading ? (
          <AdminLoadingState description="Loading Google Chat integration data." />
        ) : activeTab === "users" ? (
          <UsersTable users={data?.linkedUsers ?? []} />
        ) : activeTab === "spaces" ? (
          <SpacesTable spaces={data?.spaces ?? []} />
        ) : (
          <DeliveriesTable
            deliveries={data?.recentDeliveries ?? []}
            stats={data?.deliveryStats ?? []}
          />
        )}
      </AdminPanel>
    </>
  );
}

function UsersTable({ users }: { users: LinkedUser[] }) {
  if (users.length === 0) {
    return (
      <WorkspaceState
        variant="empty"
        eyebrow="Google Chat"
        title="No linked users"
        description="Connect a Monolith account from Google Chat to populate this register."
        icon={<Users aria-hidden="true" />}
      />
    );
  }

  return (
    <AdminTable>
      <thead>
        <tr>
          <th>Employee</th>
          <th>Google account</th>
          <th>Linked</th>
          <th>Last active</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              <strong>{user.userName}</strong>
              <small>{user.designation ?? user.userEmail}</small>
            </td>
            <td>
              <strong>{user.googleDisplayName ?? "—"}</strong>
              <small>{user.googleEmail ?? "—"}</small>
            </td>
            <td>{new Date(user.linkedAt).toLocaleDateString("en-IN")}</td>
            <td>
              {user.lastUsedAt
                ? new Date(user.lastUsedAt).toLocaleDateString("en-IN")
                : "Never"}
            </td>
            <td>
              <AdminBadge variant={statusVariant(user.linkStatus)}>
                {user.linkStatus}
              </AdminBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

function SpacesTable({ spaces }: { spaces: SpaceRecord[] }) {
  if (spaces.length === 0) {
    return (
      <WorkspaceState
        variant="empty"
        eyebrow="Google Chat"
        title="No linked spaces"
        description="Add the bot to a Google Chat space to populate this register."
        icon={<MessageSquare aria-hidden="true" />}
      />
    );
  }

  return (
    <AdminTable>
      <thead>
        <tr>
          <th>Space</th>
          <th>Type</th>
          <th>Linked record</th>
          <th>Bot member</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {spaces.map((space) => (
          <tr key={space.id}>
            <td>
              <strong>{space.displayName ?? "Unnamed space"}</strong>
              <small>{space.spaceResourceName}</small>
            </td>
            <td>{space.spaceType}</td>
            <td>
              {space.linkedRecordLabel ? (
                <span>
                  <Link2 aria-hidden="true" /> {space.linkedRecordLabel}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td>
              {space.botMember ? (
                <CheckCircle aria-label="Bot is a member" />
              ) : (
                <AlertCircle aria-label="Bot is not a member" />
              )}
            </td>
            <td>
              <AdminBadge variant={statusVariant(space.linkStatus)}>
                {space.linkStatus}
              </AdminBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

function DeliveriesTable({
  deliveries,
  stats,
}: {
  deliveries: Delivery[];
  stats: DeliveryStat[];
}) {
  return (
    <>
      {stats.length > 0 ? (
        <div className="mnx-admin-delivery-stats">
          {stats.map((stat) => (
            <div key={stat.status}>
              <small>{stat.status.replaceAll("_", " ")}</small>
              <strong>{stat.count}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <AdminTable>
        <thead>
          <tr>
            <th>Event kind</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.length === 0 ? (
            <AdminEmptyTableRow colSpan={3}>
              No deliveries yet
            </AdminEmptyTableRow>
          ) : (
            deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td>{delivery.eventKind ?? "—"}</td>
                <td>
                  <AdminBadge variant={statusVariant(delivery.status)}>
                    {delivery.status}
                  </AdminBadge>
                </td>
                <td>
                  {new Date(delivery.createdAt).toLocaleString("en-IN")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </>
  );
}
