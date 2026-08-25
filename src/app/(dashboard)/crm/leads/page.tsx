import { redirect } from "next/navigation";
import { Briefcase, Mail, Phone, Plus, Users } from "lucide-react";
import {
  CrmActionLink,
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { OperationalLinkedRow } from "@/components/data-display/operational-linked-row";
import { WorkspaceState } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { listLeads } from "@/modules/crm/service";
import { LeadRegisterToolbar } from "@/modules/crm/components/leads/lead-register-toolbar";

interface SearchParams {
  search?: string;
  status?: string;
  tab?: string;
}

type LeadTabKey = "unopened" | "not_interested" | "unreachable";

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch {
    return <CrmPermissionState description="You do not have permission to view CRM leads." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const status = awaitedParams.status || "";
  const tab = (awaitedParams.tab || "unopened") as LeadTabKey;

  const leads = await listLeads(orgId, { search, status });

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const unopenedLeads = leads.filter((lead) => {
    if (lead.status === "NOT_INTERESTED") return false;
    if (lead.status === "NOT_PICKED" || lead.status === "NOT_REACHABLE") {
      return new Date(lead.updatedAt) <= twoHoursAgo;
    }
    return true;
  });

  const notInterestedLeads = leads.filter(
    (lead) => lead.status === "NOT_INTERESTED",
  );

  const unreachableLeads = leads.filter((lead) => {
    if (lead.status === "NOT_PICKED" || lead.status === "NOT_REACHABLE") {
      return new Date(lead.updatedAt) > twoHoursAgo;
    }
    return false;
  });

  let displayedLeads = unopenedLeads;
  if (tab === "not_interested") {
    displayedLeads = notInterestedLeads;
  } else if (tab === "unreachable") {
    displayedLeads = unreachableLeads;
  }

  function formatTimer(updatedAt: Date): string {
    const diffMs =
      new Date(updatedAt).getTime() + 2 * 60 * 60 * 1000 - now.getTime();
    if (diffMs <= 0) return "Ready";
    const mins = Math.ceil(diffMs / (60 * 1000));
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m left`;
    }
    return `${mins}m left`;
  }

  const leadStatuses = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "LOST",
    "ATTEMPTED_TO_CONTACT",
    "NOT_INTERESTED",
    "NOT_PICKED",
    "NOT_REACHABLE",
  ];

  return (
    <OperationalDataTable>
      <LeadRegisterToolbar
        displayedCount={displayedLeads.length}
        leadStatuses={leadStatuses}
        search={search}
        status={status}
        tab={tab}
        tabCounts={{
          unopened: unopenedLeads.length,
          not_interested: notInterestedLeads.length,
          unreachable: unreachableLeads.length,
        }}
        totalCount={leads.length}
      />

      {displayedLeads.length === 0 ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <tbody>
              <OperationalTableEmpty colSpan={6}>
                <WorkspaceState
                  variant="empty"
                  eyebrow="Demand qualification"
                  title={
                    tab === "unopened"
                      ? "No active leads found"
                      : tab === "not_interested"
                        ? "No uninterested leads found"
                        : "No unreachable leads found"
                  }
                  description={
                    tab === "unopened"
                      ? "Either refine your filters or create a fresh lead record to get started with validation."
                      : tab === "not_interested"
                        ? "Leads marked as Not Interested will show up here."
                        : "Leads marked as Not Picked or Unreachable will appear here during their 2-hour cooldown window."
                  }
                  icon={<Users aria-hidden="true" />}
                  action={
                    tab === "unopened" ? (
                      <CrmActionLink href="/crm/leads/new" primary>
                        <Plus size={16} />
                        <span>Create Lead</span>
                      </CrmActionLink>
                    ) : null
                  }
                />
              </OperationalTableEmpty>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      ) : (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Lead Name</OperationalTableHead>
                <OperationalTableHead>Company</OperationalTableHead>
                <OperationalTableHead>Contact Info</OperationalTableHead>
                <OperationalTableHead>Source</OperationalTableHead>
                <OperationalTableHead>
                  {tab === "unreachable" ? "Timer Window" : "Lead Status"}
                </OperationalTableHead>
                <OperationalTableHead>Owner</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {displayedLeads.map((lead) => (
                <OperationalLinkedRow
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  ariaLabel={`Open lead ${lead.firstName ? `${lead.firstName} ${lead.lastName}` : lead.lastName}`}
                >
                  <OperationalPrimaryCell
                    primary={`${lead.firstName ? `${lead.firstName} ` : ""}${lead.lastName}`}
                    secondary={lead.designation}
                  />
                  <OperationalTableCell>
                    <div className="mnx-crm-leads-company">
                      <Briefcase size={14} />
                      <span>{lead.company}</span>
                    </div>
                  </OperationalTableCell>
                  <OperationalTableCell className="mnx-crm-leads-contact">
                    {lead.email ? (
                      <div className="mnx-crm-leads-contact-item">
                        <Mail size={14} />
                        <span>{lead.email}</span>
                      </div>
                    ) : null}
                    {lead.phone ? (
                      <div className="mnx-crm-leads-contact-item">
                        <Phone size={14} />
                        <span>{lead.phone}</span>
                      </div>
                    ) : null}
                  </OperationalTableCell>
                  <OperationalTableCell className="mnx-crm-leads-source">
                    {lead.source || "Cold Call"}
                  </OperationalTableCell>
                  <OperationalTableCell>
                    {tab === "unreachable" ? (
                      <div className="mnx-crm-leads-timer">
                        <OperationalStatus tone="warning">
                          {lead.status.replace("_", " ")}
                        </OperationalStatus>
                        <span className="mnx-crm-leads-timer-value">
                          {formatTimer(lead.updatedAt)}
                        </span>
                      </div>
                    ) : (
                      <OperationalStatus
                        tone={
                          lead.status === "QUALIFIED"
                            ? "success"
                            : lead.status === "LOST" ||
                                lead.status === "NOT_INTERESTED"
                              ? "danger"
                              : lead.status === "NEW"
                                ? "info"
                                : "warning"
                        }
                      >
                        {lead.status.replace("_", " ")}
                      </OperationalStatus>
                    )}
                  </OperationalTableCell>
                  <OperationalTableCell className="mnx-crm-leads-owner">
                    {lead.owner.name}
                  </OperationalTableCell>
                </OperationalLinkedRow>
              ))}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}
      <OperationalDataTableFooter
        summary={`Showing ${displayedLeads.length === 0 ? "0" : `1-${displayedLeads.length}`} of ${displayedLeads.length} leads`}
      />
    </OperationalDataTable>
  );
}
