"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Settings,
  Mail,
  ShieldAlert,
  Server,
  Database,
  UploadCloud,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  getCommunicationSettings,
  updateCommunicationSettings,
  listRetentionPolicies,
  upsertRetentionPolicy,
  getDnsChecklist,
} from "@/modules/communication/communication-admin.service";
import { listMailAccounts, saveMailAccount } from "@/modules/communication/mail.service";
import { importMbox, importIcs, MigrationLog } from "@/modules/communication/communication-migration.service";

export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"settings" | "mailboxes" | "dns" | "retention" | "migration">("settings");
  const [isPending, startTransition] = useTransition();

  // Settings state
  const [settings, setSettings] = useState<any>({
    allowedDomains: "*",
    externalSharingEnabled: false,
    jitsiServerUrl: "https://meet.jit.si",
    onlyOfficeUrl: "",
  });

  // Mail Accounts state
  const [mailAccounts, setMailAccounts] = useState<any[]>([]);
  const [newMailAccount, setNewMailAccount] = useState({
    name: "",
    email: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    imapHost: "",
    imapPort: 993,
    imapUser: "",
    imapPassword: "",
    isShared: false,
  });

  // DNS checklist
  const [dnsChecklist, setDnsChecklist] = useState<any[]>([]);

  // Retention Policies state
  const [retentionRules, setRetentionRules] = useState<any[]>([]);
  const [newRetention, setNewRetention] = useState({
    targetTable: "ChatMessage",
    retentionDays: 365,
  });

  // Migration importer state
  const [migrationSource, setMigrationSource] = useState<"MBOX" | "ICS">("MBOX");
  const [migrationFileName, setMigrationFileName] = useState("takeout-export.mbox");
  const [migrationContent, setMigrationContent] = useState("");
  const [importerLogs, setImporterLogs] = useState<MigrationLog[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);

  // Load Data
  const loadData = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      startTransition(async () => {
        try {
          const s = await getCommunicationSettings(userId, orgId);
          setSettings(s);
          const accounts = await listMailAccounts(userId, orgId);
          setMailAccounts(accounts);
          const dns = await getDnsChecklist(userId, orgId);
          setDnsChecklist(dns);
          const rules = await listRetentionPolicies(userId, orgId);
          setRetentionRules(rules);
        } catch (err) {
          console.error("Failed to load admin settings:", err);
        }
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;

    startTransition(async () => {
      try {
        await updateCommunicationSettings(userId, orgId, {
          allowedDomains: settings.allowedDomains,
          externalSharingEnabled: settings.externalSharingEnabled,
          jitsiServerUrl: settings.jitsiServerUrl,
          onlyOfficeUrl: settings.onlyOfficeUrl,
        });
        toast.success("Communication settings updated successfully!");
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to save settings");
      }
    });
  };

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;

    startTransition(async () => {
      try {
        await saveMailAccount(userId, orgId, {
          name: newMailAccount.name,
          email: newMailAccount.email,
          smtpHost: newMailAccount.smtpHost || undefined,
          smtpPort: newMailAccount.smtpPort ? Number(newMailAccount.smtpPort) : undefined,
          smtpUser: newMailAccount.smtpUser || undefined,
          smtpPassword: newMailAccount.smtpPassword || undefined,
          imapHost: newMailAccount.imapHost || undefined,
          imapPort: newMailAccount.imapPort ? Number(newMailAccount.imapPort) : undefined,
          imapUser: newMailAccount.imapUser || undefined,
          imapPassword: newMailAccount.imapPassword || undefined,
          isShared: newMailAccount.isShared,
        });
        toast.success("Mail account registered successfully!");
        setNewMailAccount({
          name: "",
          email: "",
          smtpHost: "",
          smtpPort: 587,
          smtpUser: "",
          smtpPassword: "",
          imapHost: "",
          imapPort: 993,
          imapUser: "",
          imapPassword: "",
          isShared: false,
        });
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to register account");
      }
    });
  };

  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;

    startTransition(async () => {
      try {
        await upsertRetentionPolicy(
          userId,
          orgId,
          newRetention.targetTable,
          Number(newRetention.retentionDays)
        );
        toast.success("Retention rule configured successfully!");
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to update policy");
      }
    });
  };

  const handleRunImport = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId || !migrationContent.trim()) {
      toast.error("Please supply import archive content first.");
      return;
    }

    startTransition(async () => {
      try {
        let summary;
        if (migrationSource === "MBOX") {
          // Select first available mailbox or error
          if (mailAccounts.length === 0) {
            toast.error("Please configure at least one mail account in the previous tab before importing mail.");
            return;
          }
          summary = await importMbox(
            userId,
            orgId,
            mailAccounts[0].id,
            migrationFileName,
            migrationContent
          );
        } else {
          summary = await importIcs(
            userId,
            orgId,
            migrationFileName,
            migrationContent
          );
        }

        setImporterLogs(summary.logs);
        setImportSummary(summary);
        if (summary.success) {
          toast.success("Import completed successfully!");
        } else {
          toast.error("Importer finished with errors.");
        }
      } catch (err: any) {
        toast.error(err.message || "Importer fatal error.");
      }
    });
  };

  const loadMockMboxContent = () => {
    setMigrationFileName("google-takeout-gmail.mbox");
    setMigrationContent(
      `From: internal-comms@monolithengine.com\n` +
      `To: team@monolithengine.com\n` +
      `Subject: Q3 Shipping Operations Roadmap Release\n` +
      `Date: Fri, 19 Jun 2026 14:00:00 +0000\n` +
      `\n` +
      `Team, the roadmap for Q3 automated cargo manifests and billing modules is approved. Please inspect task tickets.\n` +
      `\n` +
      `From: hr@monolithengine.com\n` +
      `To: employee@monolithengine.com\n` +
      `Subject: Biometric Check-In System Guidelines\n` +
      `Date: Thu, 18 Jun 2026 09:30:00 +0000\n` +
      `\n` +
      `Please ensure all biometric scans are registered before Monday 10:00 AM.`
    );
  };

  const loadMockIcsContent = () => {
    setMigrationFileName("google-takeout-calendar.ics");
    setMigrationContent(
      `BEGIN:VCALENDAR\n` +
      `VERSION:2.0\n` +
      `PRODID:-//Google Inc//Google Calendar 70.9054//EN\n` +
      `BEGIN:VEVENT\n` +
      `SUMMARY:Weekly Manifest Review Sync\n` +
      `DESCRIPTION:Review pending customs releases for Adarsh container shipping lines.\n` +
      `DTSTART:20260625T100000Z\n` +
      `DTEND:20260625T110000Z\n` +
      `END:VEVENT\n` +
      `BEGIN:VEVENT\n` +
      `SUMMARY:Board Meeting - Q2 Financials\n` +
      `DESCRIPTION:Review general ledgers and trial balance audits.\n` +
      `DTSTART:20260628T140000Z\n` +
      `DTEND:20260628T163000Z\n` +
      `END:VEVENT\n` +
      `END:VCALENDAR`
    );
  };

  return (
    <div className="py-6 px-4 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 shadow-sm">
        <div>
          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">
            WORKSPACE MANAGEMENT
          </span>
          <h1 className="ds-h1 text-white text-2xl font-bold mt-1 uppercase">
            Communication Admin Console
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
            Configure shared inboxes, Jitsi/ONLYOFFICE adapter nodes, retention policies, and import legacy datasets.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1 bg-[#161f28] border border-[var(--color-outline-variant)] hover:text-white px-3 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold cursor-pointer text-slate-300 transition-all"
        >
          <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
          Refresh Console
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-outline-variant)]/60 pb-3">
        {[
          { key: "settings", label: "Settings & Providers", icon: Settings },
          { key: "mailboxes", label: "Shared Mailboxes & SMTP", icon: Mail },
          { key: "dns", label: "DNS Checklist", icon: Server },
          { key: "retention", label: "Retention Policies", icon: Database },
          { key: "migration", label: "Google Workspace Importer", icon: UploadCloud },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                isActive
                  ? "bg-[#00cec4]/15 text-[#00cec4] border-[#00cec4]/35 shadow-[0_0_0_3px_rgba(0,206,196,0.15)]"
                  : "bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Panel 1: Settings & Providers */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveSettings} className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 space-y-6">
            <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2 flex items-center gap-2">
              <Server size={16} className="text-[#00cec4]" />
              Enterprise Platform Providers
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <label className="ds-label text-slate-400">Jitsi Meet Server URL</label>
                <input
                  type="text"
                  placeholder="https://meet.jit.si"
                  value={settings.jitsiServerUrl || ""}
                  onChange={(e) => setSettings({ ...settings, jitsiServerUrl: e.target.value })}
                  className="w-full text-white bg-[var(--color-surface-container)]"
                />
                <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                  Meeting rooms generates automatically using this endpoint via WebRTC client containers.
                </p>
              </div>

              <div className="space-y-1">
                <label className="ds-label text-slate-400">ONLYOFFICE Document Server URL</label>
                <input
                  type="text"
                  placeholder="e.g. http://onlyoffice.monolithengine.local"
                  value={settings.onlyOfficeUrl || ""}
                  onChange={(e) => setSettings({ ...settings, onlyOfficeUrl: e.target.value })}
                  className="w-full text-white bg-[var(--color-surface-container)]"
                />
                <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                  Adapter target for opening collaborative text editors and spreadsheet calculators.
                </p>
              </div>

              <div className="space-y-1">
                <label className="ds-label text-slate-400">Restricted Communication Domains</label>
                <input
                  type="text"
                  placeholder="e.g. monolithengine.com, adarshshipping.com"
                  value={settings.allowedDomains || ""}
                  onChange={(e) => setSettings({ ...settings, allowedDomains: e.target.value })}
                  className="w-full text-white bg-[var(--color-surface-container)]"
                />
                <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                  Use comma separated list or * to allow all domains to receive messages.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl mt-4">
                <div className="space-y-0.5">
                  <span className="text-white text-xs font-bold font-sans uppercase">Allow External Document Sharing</span>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    Allows generated file links to be access toggled to public view index.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.externalSharingEnabled || false}
                  onChange={(e) => setSettings({ ...settings, externalSharingEnabled: e.target.checked })}
                  className="h-4 w-4 rounded bg-[#161f28] border-cyan-500/50 text-[#00cec4] focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-outline-variant)]/40">
              <button
                type="submit"
                disabled={isPending}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* Panel 2: Shared Mailboxes & SMTP */}
        {activeTab === "mailboxes" && (
          <div className="space-y-6">
            
            {/* Create New Form */}
            <form onSubmit={handleCreateMailbox} className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 space-y-4">
              <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2 flex items-center gap-2">
                <Plus size={16} className="text-[#00cec4]" />
                Register Mail Account / Shared Inbox
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="ds-label text-slate-400">Account Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Adarsh Helpdesk"
                    value={newMailAccount.name}
                    onChange={(e) => setNewMailAccount({ ...newMailAccount, name: e.target.value })}
                    className="w-full text-white bg-[var(--color-surface-container)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="ds-label text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="support@adarshshipping.com"
                    value={newMailAccount.email}
                    onChange={(e) => setNewMailAccount({ ...newMailAccount, email: e.target.value })}
                    className="w-full text-white bg-[var(--color-surface-container)]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl mt-3">
                  <div className="space-y-0.5">
                    <span className="text-white text-[10px] font-bold font-sans uppercase">Shared Box</span>
                    <p className="text-[8px] text-[var(--color-on-surface-variant)] uppercase font-semibold">Allow all members to read</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newMailAccount.isShared}
                    onChange={(e) => setNewMailAccount({ ...newMailAccount, isShared: e.target.checked })}
                    className="h-4 w-4 rounded bg-[#161f28] border-cyan-500/50 text-[#00cec4] cursor-pointer"
                  />
                </div>
              </div>

              {/* SMTP Config */}
              <div className="p-4 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] space-y-4">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Outgoing SMTP Server Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="mail.smtp.com"
                      value={newMailAccount.smtpHost}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, smtpHost: e.target.value })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">SMTP Port</label>
                    <input
                      type="number"
                      value={newMailAccount.smtpPort}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, smtpPort: Number(e.target.value) })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">SMTP User</label>
                    <input
                      type="text"
                      placeholder="user@smtp.com"
                      value={newMailAccount.smtpUser}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, smtpUser: e.target.value })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">SMTP Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newMailAccount.smtpPassword}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, smtpPassword: e.target.value })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                </div>
              </div>

              {/* IMAP Config */}
              <div className="p-4 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] space-y-4">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Incoming IMAP Server Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">IMAP Host</label>
                    <input
                      type="text"
                      placeholder="mail.imap.com"
                      value={newMailAccount.imapHost}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, imapHost: e.target.value })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">IMAP Port</label>
                    <input
                      type="number"
                      value={newMailAccount.imapPort}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, imapPort: Number(e.target.value) })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">IMAP User</label>
                    <input
                      type="text"
                      placeholder="user@imap.com"
                      value={newMailAccount.imapUser}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, imapUser: e.target.value })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-label text-slate-400">IMAP Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newMailAccount.imapPassword}
                      onChange={(e) => setNewMailAccount({ ...newMailAccount, imapPassword: e.target.value })}
                      className="w-full text-white bg-[var(--color-surface-container)]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                  Register Mailbox
                </button>
              </div>
            </form>

            {/* List Mailboxes */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
              <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2">
                Active Mailboxes
              </h3>
              <table className="ds-table text-xs">
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Email Address</th>
                    <th>Outgoing SMTP</th>
                    <th>Incoming IMAP</th>
                    <th>Sharing Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mailAccounts.map((acc) => (
                    <tr key={acc.id}>
                      <td className="text-white font-bold">{acc.name}</td>
                      <td>{acc.email}</td>
                      <td>{acc.smtpHost ? `${acc.smtpHost}:${acc.smtpPort}` : "Internal Only"}</td>
                      <td>{acc.imapHost ? `${acc.imapHost}:${acc.imapPort}` : "Internal Only"}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          acc.isShared ? "bg-[#00cec4]/15 text-[#00cec4]" : "bg-slate-800 text-slate-300"
                        }`}>
                          {acc.isShared ? "SHARED BOX" : "PRIVATE BOX"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {mailAccounts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold">
                        No mail accounts registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Panel 3: DNS Checklist */}
        {activeTab === "dns" && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 space-y-5">
            <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2 flex items-center gap-2">
              <Server size={16} className="text-[#00cec4]" />
              MX, SPF, DKIM, & DMARC DNS Configuration
            </h3>
            <p className="text-[var(--color-on-surface-variant)] text-xs">
              Configure the following records on your domain registrar (e.g. Cloudflare, Route53) to link Monolith outbound emails to external domains.
            </p>

            <div className="space-y-4">
              {dnsChecklist.map((dns, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-low)] space-y-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#00cec4]/10 text-[#00cec4] text-xs font-mono font-bold">
                        {dns.type}
                      </span>
                      <span className="text-white font-mono text-xs font-bold">
                        {dns.host}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
                      {dns.status === "VERIFIED" ? (
                        <span className="text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-1 rounded flex items-center gap-1">
                          <CheckCircle size={10} /> Verified
                        </span>
                      ) : (
                        <span className="text-orange-400 bg-orange-950 border border-orange-500/20 px-2.5 py-1 rounded flex items-center gap-1">
                          <AlertTriangle size={10} /> Pending / Warning
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="ds-label text-slate-400">DNS VALUE (TXT / MX Record payload)</span>
                    <div className="bg-[#0f1319] p-3 rounded-lg border border-[var(--color-outline-variant)]/40 font-mono text-xs text-white break-all select-all select-none">
                      {dns.value}
                    </div>
                  </div>

                  <p className="text-[10px] text-[var(--color-on-surface-variant)] italic">
                    {dns.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel 4: Retention Policies */}
        {activeTab === "retention" && (
          <div className="space-y-6">
            
            {/* Create Retention Rule */}
            <form onSubmit={handleSaveRetention} className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 space-y-4">
              <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2 flex items-center gap-2">
                <Database size={16} className="text-[#00cec4]" />
                Configure Database Retention Policy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="ds-label text-slate-400">Target Data Entity</label>
                  <select
                    value={newRetention.targetTable}
                    onChange={(e) => setNewRetention({ ...newRetention, targetTable: e.target.value })}
                    className="w-full text-white bg-[var(--color-surface-container)]"
                  >
                    <option value="ChatMessage">Internal Chat Messages (ChatMessage)</option>
                    <option value="MailMessage">Mail Delivery Records (MailMessage)</option>
                    <option value="FileAsset">File Drive Assets (FileAsset)</option>
                    <option value="CommDocument">Workspace Documents (CommDocument)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="ds-label text-slate-400">Retention Threshold (Days before soft-delete)</label>
                  <input
                    type="number"
                    required
                    value={newRetention.retentionDays}
                    onChange={(e) => setNewRetention({ ...newRetention, retentionDays: Number(e.target.value) })}
                    className="w-full text-white bg-[var(--color-surface-container)]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                  Configure Policy
                </button>
              </div>
            </form>

            {/* Rules Listing */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
              <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2">
                Active Retention Policies
              </h3>
              <table className="ds-table text-xs">
                <thead>
                  <tr>
                    <th>Entity Table</th>
                    <th>Retention Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="text-white font-mono font-bold">{rule.targetTable}</td>
                      <td className="ds-numeric text-white">{rule.retentionDays} Days</td>
                      <td>
                        <span className="bg-[#22c55e]/15 text-[#22c55e] px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
                          Active Enforcer
                        </span>
                      </td>
                    </tr>
                  ))}
                  {retentionRules.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold">
                        No retention policies configured. Standard infinite storage applies.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Panel 5: Google Workspace Importer */}
        {activeTab === "migration" && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-6 space-y-6">
            <h3 className="ds-h3 text-white text-sm font-bold border-b border-[var(--color-outline-variant)]/40 pb-2 flex items-center gap-2">
              <UploadCloud size={16} className="text-[#00cec4]" />
              Google Takeout Workspace Importer
            </h3>
            <p className="text-[var(--color-on-surface-variant)] text-xs">
              Load and parse email archives (.mbox format) or calendar exports (.ics calendars) to populate user mail folders and agenda planners automatically.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
              {/* Left Form: Config */}
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-1">
                  <label className="ds-label text-slate-400">Import Source Stream Type</label>
                  <select
                    value={migrationSource}
                    onChange={(e) => {
                      const val = e.target.value as "MBOX" | "ICS";
                      setMigrationSource(val);
                      if (val === "MBOX") loadMockMboxContent();
                      else loadMockIcsContent();
                    }}
                    className="w-full text-white bg-[var(--color-surface-container)]"
                  >
                    <option value="MBOX">Gmail Export Archive (.mbox)</option>
                    <option value="ICS">Google Calendar Planner (.ics)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="ds-label text-slate-400">File Name</label>
                  <input
                    type="text"
                    value={migrationFileName}
                    onChange={(e) => setMigrationFileName(e.target.value)}
                    className="w-full text-white bg-[var(--color-surface-container)]"
                  />
                </div>

                <div className="space-y-2">
                  <span className="ds-label block text-slate-400">Archive Stream Data Content</span>
                  <textarea
                    rows={10}
                    placeholder="MBOX / ICS plain text data..."
                    value={migrationContent}
                    onChange={(e) => setMigrationContent(e.target.value)}
                    className="w-full text-white bg-[var(--color-surface-container)] font-mono text-[10px] min-h-[220px]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={migrationSource === "MBOX" ? loadMockMboxContent : loadMockIcsContent}
                      className="bg-slate-800 text-slate-300 hover:text-white border border-[var(--color-outline-variant)] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                    >
                      Preload Mock Takeout Export
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRunImport}
                    disabled={isPending}
                    className="w-full bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Parsing Archive File...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        <span>Execute Migration Import</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Importer Live Console logs */}
              <div className="md:col-span-7 flex flex-col h-full space-y-4">
                <span className="ds-label text-slate-400">Takeout Importer Output Console</span>
                <div className="flex-1 bg-[#090d12] border border-[var(--color-outline-variant)]/60 rounded-xl p-4 font-mono text-[10px] text-[#00cec4] min-h-[350px] max-h-[450px] overflow-y-auto space-y-1.5 flex flex-col justify-start">
                  {importerLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`break-all leading-normal ${
                        log.level === "ERROR"
                          ? "text-red-450"
                          : log.level === "WARNING"
                          ? "text-orange-400"
                          : "text-[#00cec4]"
                      }`}
                    >
                      [{log.timestamp}] <span className="font-bold">{log.level}</span>: {log.message}
                    </div>
                  ))}
                  {importerLogs.length === 0 && (
                    <div className="m-auto text-center text-slate-500 uppercase tracking-widest font-semibold py-8 select-none">
                      Console Idle. Awaiting stream load.
                    </div>
                  )}
                </div>

                {importSummary && (
                  <div className="grid grid-cols-3 gap-2 text-center text-white bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] p-4 rounded-xl">
                    <div>
                      <span className="ds-label block text-slate-400">Imported</span>
                      <span className="text-sm font-bold text-[#00cec4] ds-numeric">{importSummary.importedCount}</span>
                    </div>
                    <div>
                      <span className="ds-label block text-slate-400">Skipped</span>
                      <span className="text-sm font-bold text-orange-400 ds-numeric">{importSummary.skippedCount}</span>
                    </div>
                    <div>
                      <span className="ds-label block text-slate-400">Failed</span>
                      <span className="text-sm font-bold text-red-500 ds-numeric">{importSummary.failedCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
