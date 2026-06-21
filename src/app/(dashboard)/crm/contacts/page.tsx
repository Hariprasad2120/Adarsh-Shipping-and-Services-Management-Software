import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { deleteContactAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmContactsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.contact.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM contacts.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch contacts from db
  const contacts = await listContacts(orgId, { search });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f1319] p-4 rounded-xl border border-[#1c212a]/50">
        <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search contacts by name, email, department..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Search
          </button>
          
          {search && (
            <Link
              href="/crm/contacts"
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center"
            >
              Reset
            </Link>
          )}
        </form>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-bold">
            Showing {contacts.length} contacts
          </div>
          <Link
            href="/crm/contacts/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Create Contact</span>
          </Link>
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl overflow-hidden shadow-2xl">
        {contacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <div className="size-12 rounded-full bg-slate-800/40 text-slate-600 flex items-center justify-center mx-auto">
              <Users className="size-6" />
            </div>
            <h3 className="font-bold text-base text-white">No active contacts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create a fresh contact details record linked to an existing customer account.</p>
            <Link
              href="/crm/contacts/new"
              className="inline-flex items-center gap-1.5 text-[#00c4b6] hover:underline text-xs font-bold"
            >
              <span>Onboard a contact</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-[#1c212a]/80 bg-[#0c0f14]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Contact Name</th>
                  <th className="px-6 py-4">Account (Company)</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Liaison Flag</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c212a]/30">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-[#161f28]/35 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <Link href={`/crm/contacts/${contact.id}`} className="hover:text-[#00c4b6] transition-all block">
                        {contact.firstName ? `${contact.firstName} ` : ""}{contact.lastName}
                      </Link>
                      {contact.designation && (
                        <span className="text-[11px] text-slate-400 block font-normal">{contact.designation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 p-0">
                      {contact.account ? (
                        <Link
                          href={`/crm/customers/${contact.account.id}`}
                          className="flex items-center gap-1.5 text-slate-300 hover:text-[#00c4b6] transition-all px-6 py-4 block w-full h-full"
                        >
                          <Building className="size-3.5 text-slate-500" />
                          <span>{contact.account.name}</span>
                        </Link>
                      ) : (
                        <div className="px-6 py-4">
                          <span className="text-slate-500 italic">No account linked</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {contact.email ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail className="size-3.5 text-slate-500" />
                          <span>{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No email</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.phone || contact.mobile ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Phone className="size-3.5 text-slate-500" />
                          <span>{contact.phone || contact.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No phone</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.isDecisionMaker ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00c4b6]/10 text-[#00c4b6]">
                          DECISION MAKER
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                      {contact.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/crm/contacts/${contact.id}`}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/40 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <DeleteRecordButton
                          recordId={contact.id}
                          deleteAction={deleteContactAction}
                          confirmMessage="Are you sure you want to delete this contact?"
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
