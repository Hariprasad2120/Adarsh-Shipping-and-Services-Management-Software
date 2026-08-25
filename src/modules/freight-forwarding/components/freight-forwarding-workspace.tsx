import {
  PlaneTakeoff,
  Route,
  ShipWheel,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import {
  WorkspaceAction,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";

type FreightForwardingBooking = {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  bookingNumber: string;
  status: string;
  createdAt: string;
};

export function FreightForwardingWorkspace({
  bookings = [],
}: {
  bookings?: FreightForwardingBooking[];
}) {
  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Freight forwarding"
        title="Freight Forwarding"
        description="Create bookings and manage forwarding work."
        actions={
          <ButtonLink href="/freight-forwarding/create-booking" variant="inverse">
            Create Booking
          </ButtonLink>
        }
      />

      <section className="mnx-workspace-metrics" aria-label="Freight forwarding summary">
        <WorkspaceMetric
          icon={<Route size={17} aria-hidden="true" />}
          label="Active lanes"
          value={bookings.length}
          detail={bookings.length ? "Converted quotation bookings" : "No workflows configured yet"}
        />
        <WorkspaceMetric
          icon={<PlaneTakeoff size={17} aria-hidden="true" />}
          label="Air shipments"
          value={bookings.length}
          detail="Testing-phase booking placeholders"
        />
        <WorkspaceMetric
          icon={<ShipWheel size={17} aria-hidden="true" />}
          label="Ocean shipments"
          value={bookings.length}
          detail="Ready for future booking processing"
        />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Workspace status"
        description="The booking route is now live and the module can create MBL, HBL, or linked MBL and HBL transactions from the dedicated create-booking page."
      />

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Starter state"
          title="Freight bookings"
          description="Approved quotation conversions appear here immediately during the testing phase, even though the full Freight Forwarding create-booking workflow is still pending."
        />
        {bookings.length === 0 ? (
          <div className="mnx-panel-state">
            <WorkspaceEmptyState
              title="No freight bookings yet"
              description="Create a booking from a customer-approved quotation to populate this starter workspace."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--mnx-border)] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Quotation</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.bookingNumber}
                    className="border-b border-[var(--mnx-border)] last:border-b-0"
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--mnx-text-strong)]">
                      {booking.bookingNumber}
                    </td>
                    <td className="px-4 py-3 text-[var(--mnx-text-strong)]">
                      {booking.customerName}
                    </td>
                    <td className="px-4 py-3 text-[var(--mnx-text-muted)]">
                      {booking.quoteNumber}
                    </td>
                    <td className="px-4 py-3 text-[var(--mnx-text-muted)]">
                      {booking.createdAt}
                    </td>
                    <td className="px-4 py-3 text-[var(--mnx-text-muted)]">
                      {booking.status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <WorkspaceAction
                        disabled
                        aria-disabled="true"
                        title="Process Booking will connect to the future Freight Forwarding booking form in a later phase."
                      >
                        Process Booking
                      </WorkspaceAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WorkspacePanel>
    </WorkspacePage>
  );
}
