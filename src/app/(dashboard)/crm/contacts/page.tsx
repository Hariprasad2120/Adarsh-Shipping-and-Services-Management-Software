import { CrmButton, CrmInput, CrmTable, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listContacts } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  Users,
  Plus,
  Phone,
  Mail,
  Eye,
  Building,
  ArrowRight
} from "lucide-react";
import { deleteContactAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmContactsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.contact.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM contacts." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch contacts from db
  const contacts = await listContacts(orgId, { search });

  return (
    <div className="space-y-6">

      {/* Unified Table Shell — toolbar + table in one rounded container */}
      <div className="overflow-hidden rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 border-b border-[var(--mnx-border)]">
          <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-[var(--mnx-muted)]" />
              <CrmInput
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search contacts by name, email, department..."
                className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-soft)] rounded-lg text-sm text-[var(--mnx-text-strong)] placeholder:text-placeholder focus:outline-none"
              />
            </div>

            <CrmButton
              type="submit"
              className="px-4 py-1.5 bg-[var(--mnx-soft)] hover:bg-[var(--mnx-soft)] border border-[var(--mnx-border)] text-[var(--mnx-text-strong)] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Search
            </CrmButton>
            
            {search && (
              <Link
                href="/crm/contacts"
                className="px-3 py-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] text-xs font-semibold flex items-center justify-center"
              >
                Reset
              </Link>
            )}
          </form>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs text-[var(--mnx-muted)] font-bold">
              Showing {contacts.length} contacts
            </div>
            <Link
              href="/crm/contacts/new"
              className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Create Contact</span>
            </Link>
          </div>
        </div>

        {/* Table Content */}
        {contacts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="size-12 rounded-full bg-[var(--mnx-soft)] text-[var(--mnx-muted)] flex items-center justify-center mx-auto">
              <Users className="size-6" />
            </div>
            <h3 className="font-bold text-base text-[var(--mnx-text-strong)]">No active contacts found</h3>
            <p className="text-xs text-[var(--mnx-muted)] max-w-sm mx-auto">Create a fresh contact details record linked to an existing customer account.</p>
            <Link
              href="/crm/contacts/new"
              className="inline-flex items-center gap-1.5 text-[var(--mnx-accent)] hover:underline text-xs font-bold"
            >
              <span>Onboard a contact</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CrmTable className="mnx-crm-table">
              <thead>
                <tr>
                  <th className="px-6 py-3">Contact Name</th>
                  <th className="px-6 py-3">Account (Company)</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Liaison Flag</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="mnx-row-link">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/crm/contacts/${contact.id}`} className="hover:text-[var(--mnx-accent)] transition-colors block">
                        {contact.firstName ? `${contact.firstName} ` : ""}{contact.lastName}
                      </Link>
                      {contact.designation && (
                        <span className="mnx-label block mt-0.5 font-normal">{contact.designation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 p-0">
                      {contact.account ? (
                        <Link
                          href={`/crm/customers/${contact.account.id}`}
                          className="flex items-center gap-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-accent)] transition-colors px-6 py-4 block w-full h-full"
                        >
                          <Building className="size-3.5" />
                          <span>{contact.account.name}</span>
                        </Link>
                      ) : (
                        <div className="px-6 py-4">
                          <span className="text-[var(--mnx-muted)] italic">No account linked</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.email ? (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--mnx-muted)]">
                          <Mail className="size-3.5" />
                          <span>{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--mnx-muted)] italic">No email</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.phone || contact.mobile ? (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--mnx-muted)]">
                          <Phone className="size-3.5" />
                          <span>{contact.phone || contact.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--mnx-muted)] italic">No phone</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.isDecisionMaker ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]">
                          DECISION MAKER
                        </span>
                      ) : (
                        <span className="text-[var(--mnx-muted)] text-xs">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {contact.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/crm/contacts/${contact.id}`}
                          className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] rounded hover:bg-[var(--mnx-soft)] cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <DeleteRecordButton
                          recordId={contact.id}
                          deleteAction={deleteContactAction}
                          confirmMessage="Are you sure you want to delete this contact?"
                          className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-danger)] rounded hover:bg-[var(--mnx-danger-bg)] cursor-pointer transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </CrmTable>
          </div>
        )}
      </div>
    </div>
  );
}
