import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listThreads } from "@/lib/google-gmail-client";
import { listUpcomingEvents } from "@/lib/google-calendar-client";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Folder,
  Mail,
  MessageSquare,
  Search,
  Video,
} from "lucide-react";
import { CommunicationBadge, CommunicationEmptyTableRow, CommunicationPanel, CommunicationPanelHeader, CommunicationTable } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceAlert, WorkspaceMetric, WorkspaceSectionHeading } from "@/components/layout/workspace";

type Thread = Awaited<ReturnType<typeof listThreads>>["threads"][number];
type Meeting = Awaited<ReturnType<typeof listUpcomingEvents>>[number];

function calendarMoment(value: { dateTime: string }) {
  return (
    value.dateTime ||
    ("date" in value && typeof value.date === "string" ? value.date : "")
  );
}

function parseGoogleApiError(errorMessage: string) {
  if (
    !errorMessage ||
    !(
      errorMessage.includes("API has not been used") ||
      errorMessage.includes("SERVICE_DISABLED") ||
      errorMessage.includes("accessNotConfigured")
    )
  ) {
    return null;
  }

  const activationUrl =
    errorMessage.match(/https:\/\/console\.[^\s"'}]+/)?.[0] ??
    "https://console.cloud.google.com/apis/dashboard";
  const lower = errorMessage.toLowerCase();
  const apiName = lower.includes("gmail")
    ? "Gmail API"
    : lower.includes("calendar")
      ? "Google Calendar API"
      : lower.includes("chat")
        ? "Google Chat API"
        : lower.includes("drive")
          ? "Google Drive API"
          : "Google API";

  return { apiName, activationUrl };
}

export default async function CommunicationDashboard() {
  const session = await getSession();
  if (!session?.user) return null;

  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id },
  });

  let threads: Thread[] = [];
  let meetings: Meeting[] = [];
  let errorState: string | null = null;

  try {
    if (connection) {
      const [mailResult, meetingResult] = await Promise.all([
        listThreads({ userId: session.user.id, maxResults: 5 }),
        listUpcomingEvents({ userId: session.user.id, maxResults: 5 }),
      ]);
      threads = mailResult.threads ?? [];
      meetings = meetingResult;
    }
  } catch (error) {
    console.error("[WorkspaceHome] Failed to load workspace data:", error);
    errorState =
      error instanceof Error
        ? error.message
        : "Failed to load real-time Workspace data.";
  }

  const activeSpacesCount = await db.jobWorkspaceProfile.count({
    where: {
      orgId: session.user.orgId!,
      googleSpaceId: { not: null },
      job: { deletedAt: null },
    },
  });
  const parsedError = parseGoogleApiError(errorState ?? "");

  return (
    <>
      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Connected identity"
          title={`Hello, ${session.user.name}`}
          description={`Google Workspace is connected as ${connection?.googleEmail ?? "the authorised account"}.`}
          actions={
            <CommunicationBadge variant={errorState ? "warning" : "success"}>
              <CheckCircle2 aria-hidden="true" />
              Sync {errorState ? "issue" : "active"}
            </CommunicationBadge>
          }
        />
      </CommunicationPanel>

      {errorState ? (
        <WorkspaceAlert variant="warning">
          <AlertCircle aria-hidden="true" />
          <div>
            <strong>
              {parsedError ? "Google API enablement required" : "Sync issue"}
            </strong>
            <p>{errorState}</p>
            {parsedError ? (
              <a
                href={parsedError.activationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mnx-button mnx-button-secondary"
              >
                Enable {parsedError.apiName}
                <ArrowRight aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </WorkspaceAlert>
      ) : null}

      <section className="mnx-workspace-metrics" aria-label="Communication summary">
        <WorkspaceMetric
          href="/communication/mail"
          actionLabel="Open mailbox"
          actionIcon={<ArrowRight aria-hidden="true" />}
          icon={<Mail aria-hidden="true" />}
          label="Unread mail"
          value={threads.filter((thread) => thread.isUnread).length}
          detail="Within the latest synced threads"
        />
        <WorkspaceMetric
          href="/communication/job-spaces"
          actionLabel="Open job spaces"
          actionIcon={<ArrowRight aria-hidden="true" />}
          icon={<MessageSquare aria-hidden="true" />}
          label="Job channels"
          value={activeSpacesCount}
          detail="Provisioned active spaces"
        />
        <WorkspaceMetric
          href="/communication/meetings"
          actionLabel="Open meetings"
          actionIcon={<ArrowRight aria-hidden="true" />}
          icon={<Calendar aria-hidden="true" />}
          label="Upcoming meetings"
          value={meetings.length}
          detail="Within the next synced events"
        />
        <WorkspaceMetric
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Workspace health"
          value={errorState ? "Attention" : "Healthy"}
          detail="Connected API status"
        />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Latest workspace activity"
        description="Review recent mail and meetings, then continue into the specialised connected workspace."
      />

      <div className="mnx-communication-split">
        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Gmail"
            title="Recent email"
            actions={
              <Link
                href="/communication/mail"
                className="mnx-button mnx-button-secondary"
              >
                Open mailbox
              </Link>
            }
          />
          <CommunicationTable>
            <thead>
              <tr>
                <th>Sender</th>
                <th>Subject</th>
                <th>Snippet</th>
              </tr>
            </thead>
            <tbody>
              {threads.length === 0 ? (
                <CommunicationEmptyTableRow colSpan={3}>
                  No recent threads found.
                </CommunicationEmptyTableRow>
              ) : (
                threads.map((thread) => (
                  <tr key={thread.id}>
                    <td>
                      <strong>{thread.from.split(" <")[0]}</strong>
                      {thread.isUnread ? (
                        <CommunicationBadge variant="accent">
                          Unread
                        </CommunicationBadge>
                      ) : null}
                    </td>
                    <td>{thread.subject}</td>
                    <td>{thread.snippet}</td>
                  </tr>
                ))
              )}
            </tbody>
          </CommunicationTable>
        </CommunicationPanel>

        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Calendar"
            title="Upcoming meetings"
          />
          {meetings.length === 0 ? (
            <div className="mnx-empty-state">No upcoming meetings.</div>
          ) : (
            <div className="mnx-communication-record-list">
              {meetings.map((meeting) => (
                <article key={meeting.id} className="mnx-communication-record">
                  <div>
                    <strong>{meeting.summary}</strong>
                    <small>
                      {new Date(calendarMoment(meeting.start)).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </small>
                  </div>
                  {meeting.meetLink ? (
                    <a
                      href={meeting.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mnx-communication-record-link"
                    >
                      Join Meet
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CommunicationPanel>
      </div>

      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Shortcuts"
          title="Quick workspace actions"
        />
        <div className="mnx-communication-action-grid">
          {[
            {
              href: "/communication/mail",
              label: "Open mail",
              icon: Mail,
            },
            {
              href: "/communication/chat",
              label: "Start chat",
              icon: MessageSquare,
            },
            {
              href: "/communication/meetings",
              label: "New meeting",
              icon: Video,
            },
            {
              href: "/communication/drive",
              label: "Browse drive",
              icon: Folder,
            },
            {
              href: "/communication/search",
              label: "Search workspace",
              icon: Search,
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Icon aria-hidden="true" />
                <span>{action.label}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </CommunicationPanel>
    </>
  );
}
