"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { MessageSquare, Link2, Space, Send, AlertCircle, CheckCircle, RefreshCw, Users, Wifi, WifiOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

type DeliveryStat = {
  status: string;
  count: number;
};

type AdminData = {
  linkedUsers: LinkedUser[];
  spaces: SpaceRecord[];
  recentDeliveries: { id: string; status: string; eventKind?: string; createdAt: string }[];
  pendingDeliveries: number;
  deliveryStats: DeliveryStat[];
  totalLinkedUsers: number;
  totalSpaces: number;
};

// ─── 3D Connection Globe ─────────────────────────────────────────────────────
function ConnectionGlobe({ active }: { active: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    globe: THREE.Mesh;
    particles: THREE.Points;
    frame: number;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth;
    const H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // Globe
    const geo = new THREE.SphereGeometry(1, 48, 48);
    const mat = new THREE.MeshPhongMaterial({
      color: active ? 0x00cec4 : 0x404947,
      emissive: active ? 0x004040 : 0x111111,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const globe = new THREE.Mesh(geo, mat);
    scene.add(globe);

    // Inner core
    const coreMat = new THREE.MeshPhongMaterial({
      color: active ? 0x00cec4 : 0x333333,
      emissive: active ? 0x002828 : 0x0a0a0a,
      transparent: true,
      opacity: 0.3,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), coreMat);
    scene.add(core);

    // Particles orbiting
    const pGeo = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + Math.random() * 0.6;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: active ? 0x00cec4 : 0x555555,
      size: 0.025,
      transparent: true,
      opacity: active ? 0.8 : 0.3,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(active ? 0x00cec4 : 0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      globe.rotation.y += 0.004;
      globe.rotation.x += 0.001;
      particles.rotation.y -= 0.002;
      particles.rotation.x += 0.001;
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, globe, particles, frame };

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [active]);

  return <div ref={mountRef} className="w-full h-full" />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  accent = "cyan",
  delay = 0,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  accent?: "cyan" | "orange";
  delay?: number;
}) {
  const accentClass =
    accent === "cyan"
      ? "card-top-accent"
      : "card-top-accent-orange";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`${accentClass} bg-surface rounded-xl p-5 border border-outline-variant`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ds-label mb-2">{label}</p>
          <motion.p
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
            className="text-3xl font-bold ds-numeric text-on-surface"
          >
            {value}
          </motion.p>
        </div>
        <span
          className="ds-icon-badge"
          style={
            accent === "orange"
              ? { background: "rgba(251,146,60,0.10)", color: "#fb923c" }
              : undefined
          }
        >
          <Icon size={20} />
        </span>
      </div>
    </motion.div>
  );
}

// ─── Delivery Status Badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    sent: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", label: "Sent" },
    queued: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", label: "Queued" },
    processing: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10", label: "Processing" },
    failed_retryable: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", label: "Retrying" },
    failed_permanent: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", label: "Failed" },
    suppressed: { color: "text-on-surface-variant", bg: "bg-surface-container", label: "Suppressed" },
    cancelled: { color: "text-on-surface-variant", bg: "bg-surface-container", label: "Cancelled" },
  };

  const c = config[status] ?? { color: "text-on-surface-variant", bg: "bg-surface-container", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${c.color} ${c.bg}`}>
      {c.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GoogleChatAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "spaces" | "deliveries">("users");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/google-chat/admin");
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isConnected = (data?.totalLinkedUsers ?? 0) > 0;

  const tabs = [
    { key: "users" as const, label: "Linked Users", count: data?.totalLinkedUsers },
    { key: "spaces" as const, label: "Spaces", count: data?.totalSpaces },
    { key: "deliveries" as const, label: "Deliveries", count: data?.pendingDeliveries ?? 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ds-h1">Google Chat Integration</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Manage the Monolith AI Assistant Google Chat app
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: isConnected ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border ${
              isConnected
                ? "border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4]"
                : "border-outline-variant bg-surface-container text-on-surface-variant"
            }`}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? "Active" : "No users linked"}
          </motion.div>
          <button
            onClick={load}
            className="p-2 rounded-xl hover-cyan border border-outline-variant text-on-surface-variant hover:text-[#00cec4] transition-all"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 3D Globe + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-2 overflow-hidden rounded-xl border border-outline-variant bg-surface h-64 lg:h-auto relative"
        >
          <div className="absolute inset-0">
            <ConnectionGlobe active={isConnected} />
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs text-on-surface-variant">
              {isConnected
                ? `${data?.totalLinkedUsers} user${(data?.totalLinkedUsers ?? 0) !== 1 ? "s" : ""} connected to Monolith AI`
                : "No users connected yet"}
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4 content-start">
          <StatCard
            icon={Users}
            label="Linked Users"
            value={data?.totalLinkedUsers ?? 0}
            accent="cyan"
            delay={0.1}
          />
          <StatCard
            icon={MessageSquare}
            label="Active Spaces"
            value={data?.totalSpaces ?? 0}
            accent="cyan"
            delay={0.15}
          />
          <StatCard
            icon={Send}
            label="Pending Deliveries"
            value={data?.pendingDeliveries ?? 0}
            accent={data && data.pendingDeliveries > 0 ? "orange" : "cyan"}
            delay={0.2}
          />
          <StatCard
            icon={CheckCircle}
            label="Sent (total)"
            value={data?.deliveryStats.find((s) => s.status === "sent")?.count ?? 0}
            accent="cyan"
            delay={0.25}
          />
        </div>
      </div>

      {/* Setup instructions if no users */}
      {!loading && data?.totalLinkedUsers === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#00cec4]/30 bg-[#00cec4]/5 p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#00cec4] mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-on-surface">Getting Started</p>
              <ol className="text-sm text-on-surface-variant space-y-1 list-decimal list-inside">
                <li>Open Google Chat and find <strong>Monolith AI Assistant</strong></li>
                <li>Send it a direct message — it will prompt you to connect your account</li>
                <li>Click <strong>Connect Monolith Account</strong> and log in with your Monolith credentials</li>
                <li>Return to Google Chat — you're now connected!</li>
              </ol>
              <p className="text-xs text-on-surface-variant mt-3">
                Webhook URL: <code className="bg-surface-container px-1.5 py-0.5 rounded text-[#00cec4]">{process.env.NEXT_PUBLIC_WEBHOOK_URL ?? "/api/google-chat/webhook"}</code>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-outline-variant mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-[#00cec4] text-[#00cec4]"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 bg-[#00cec4]/20 text-[#00cec4] text-xs px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "users" && <UsersTab users={data?.linkedUsers ?? []} loading={loading} />}
            {activeTab === "spaces" && <SpacesTab spaces={data?.spaces ?? []} loading={loading} />}
            {activeTab === "deliveries" && (
              <DeliveriesTab
                deliveries={data?.recentDeliveries ?? []}
                stats={data?.deliveryStats ?? []}
                loading={loading}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, loading }: { users: LinkedUser[]; loading: boolean }) {
  if (loading) return <TableSkeleton rows={5} cols={5} />;
  if (!users.length) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
        <p>No users linked yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Google Account</th>
            <th>Linked</th>
            <th>Last Active</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <motion.tr
              key={u.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <td>
                <div>
                  <p className="font-medium text-on-surface">{u.userName}</p>
                  <p className="ds-label">{u.designation ?? u.userEmail}</p>
                </div>
              </td>
              <td>
                <p className="text-sm text-on-surface">{u.googleDisplayName ?? "—"}</p>
                <p className="ds-label">{u.googleEmail ?? "—"}</p>
              </td>
              <td className="text-sm text-on-surface-variant">
                {new Date(u.linkedAt).toLocaleDateString("en-IN")}
              </td>
              <td className="text-sm text-on-surface-variant">
                {u.lastUsedAt ? new Date(u.lastUsedAt).toLocaleDateString("en-IN") : "Never"}
              </td>
              <td>
                <StatusBadge status={u.linkStatus} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Spaces Tab ───────────────────────────────────────────────────────────────
function SpacesTab({ spaces, loading }: { spaces: SpaceRecord[]; loading: boolean }) {
  if (loading) return <TableSkeleton rows={4} cols={4} />;
  if (!spaces.length) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <Space size={40} className="mx-auto mb-3 opacity-30" />
        <p>No spaces linked yet. Add the bot to a Google Chat space to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Space</th>
            <th>Type</th>
            <th>Linked Record</th>
            <th>Bot Member</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {spaces.map((s, i) => (
            <motion.tr
              key={s.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <td>
                <p className="font-medium text-on-surface">{s.displayName ?? "Unnamed Space"}</p>
                <p className="ds-label truncate max-w-[200px]">{s.spaceResourceName}</p>
              </td>
              <td className="ds-label">{s.spaceType}</td>
              <td>
                {s.linkedRecordLabel ? (
                  <span className="flex items-center gap-1.5 text-sm text-[#00cec4]">
                    <Link2 size={12} />
                    {s.linkedRecordLabel}
                  </span>
                ) : (
                  <span className="text-on-surface-variant text-sm">—</span>
                )}
              </td>
              <td>
                {s.botMember ? (
                  <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-red-500" />
                )}
              </td>
              <td>
                <StatusBadge status={s.linkStatus} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Deliveries Tab ───────────────────────────────────────────────────────────
function DeliveriesTab({
  deliveries,
  stats,
  loading,
}: {
  deliveries: { id: string; status: string; eventKind?: string; createdAt: string }[];
  stats: DeliveryStat[];
  loading: boolean;
}) {
  if (loading) return <TableSkeleton rows={6} cols={3} />;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.status}
            className="bg-surface-container rounded-xl p-3 border border-outline-variant"
          >
            <p className="ds-label mb-1">{s.status.replace(/_/g, " ")}</p>
            <p className="text-xl font-bold ds-numeric text-on-surface">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Recent list */}
      {deliveries.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Event Kind</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td className="text-sm text-on-surface">{d.eventKind ?? "—"}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="text-sm text-on-surface-variant">
                    {new Date(d.createdAt).toLocaleString("en-IN")}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-on-surface-variant">
          <Send size={40} className="mx-auto mb-3 opacity-30" />
          <p>No deliveries yet</p>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="h-4 bg-surface-container rounded animate-pulse flex-1"
                style={{ animationDelay: `${(i + j) * 0.05}s` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
