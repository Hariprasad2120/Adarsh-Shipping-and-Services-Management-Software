"use client";

import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  ExternalLink,
  Folder,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { CommunicationButton, CommunicationInput, CommunicationPanel, CommunicationPanelHeader } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceState } from "@/components/layout/workspace";

type EmailResult = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
};

type FileResult = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
};

type JobResult = {
  id: string;
  jobNumber: string;
  title: string;
};

type Results = {
  emails: EmailResult[];
  files: FileResult[];
  jobs: JobResult[];
};

const emptyResults: Results = { emails: [], files: [], jobs: [] };

export default function UnifiedSearchPortal() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results>(emptyResults);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/communication/search?q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      setResults({
        emails: data.emails ?? [],
        files: data.files ?? [],
        jobs: data.jobs ?? [],
      });
    } catch (error) {
      console.error("Unified search failed:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalResults =
    results.emails.length + results.files.length + results.jobs.length;

  return (
    <>
      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Connected index"
          title="Search mail, files, and jobs"
          description="Query Gmail threads, Google Drive files, and internal Monolith jobs together."
        />
        <form
          onSubmit={handleSearch}
          className="mnx-communication-search-form"
        >
          <span>
            <Search aria-hidden="true" />
            <CommunicationInput
              type="search"
              placeholder="Search keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              required
            />
          </span>
          <CommunicationButton
            type="submit"
            disabled={loading}
            variant="primary"
          >
            {loading ? (
              <RefreshCw className="mnx-state-spinner" aria-hidden="true" />
            ) : (
              <Search aria-hidden="true" />
            )}
            Search
          </CommunicationButton>
        </form>
      </CommunicationPanel>

      {query && !loading ? (
        <p className="mnx-communication-result-count">
          Found <strong>{totalResults}</strong> matches for “{query}”.
        </p>
      ) : null}

      {totalResults > 0 ? (
        <div className="mnx-communication-result-grid">
          <ResultPanel
            title="Jobs and shipments"
            count={results.jobs.length}
            icon={<Briefcase aria-hidden="true" />}
            empty="No matching jobs."
          >
            {results.jobs.map((job) => (
              <article key={job.id} className="mnx-communication-record">
                <div>
                  <strong>{job.jobNumber}</strong>
                  <small>{job.title}</small>
                </div>
                <Link
                  href={`/cha/jobs/${job.id}`}
                  className="mnx-communication-record-link"
                >
                  Open <ArrowRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </ResultPanel>

          <ResultPanel
            title="Email"
            count={results.emails.length}
            icon={<Mail aria-hidden="true" />}
            empty="No matching email."
          >
            {results.emails.map((email) => (
              <article key={email.id} className="mnx-communication-record">
                <div>
                  <strong>{email.subject}</strong>
                  <small>
                    {email.from.split(" <")[0]} · {email.snippet}
                  </small>
                </div>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mnx-communication-record-link"
                >
                  Open <ExternalLink aria-hidden="true" />
                </a>
              </article>
            ))}
          </ResultPanel>

          <ResultPanel
            title="Drive files"
            count={results.files.length}
            icon={<Folder aria-hidden="true" />}
            empty="No matching files."
          >
            {results.files.map((file) => (
              <article key={file.id} className="mnx-communication-record">
                <div>
                  <strong>{file.name}</strong>
                  <small>{file.mimeType.split(".").pop()}</small>
                </div>
                {file.webViewLink ? (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mnx-communication-record-link"
                  >
                    View <ExternalLink aria-hidden="true" />
                  </a>
                ) : null}
              </article>
            ))}
          </ResultPanel>
        </div>
      ) : query && !loading ? (
        <WorkspaceState
          variant="empty"
          eyebrow="Connected search"
          title="No matches"
          description="Try a different customer, shipment, subject, or document keyword."
          icon={<Search aria-hidden="true" />}
        />
      ) : null}
    </>
  );
}

function ResultPanel({
  children,
  count,
  empty,
  icon,
  title,
}: {
  children: React.ReactNode;
  count: number;
  empty: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <CommunicationPanel>
      <CommunicationPanelHeader
        eyebrow={`${count} result${count === 1 ? "" : "s"}`}
        title={title}
        actions={icon}
      />
      {count === 0 ? (
        <div className="mnx-empty-state">{empty}</div>
      ) : (
        <div className="mnx-communication-record-list">{children}</div>
      )}
    </CommunicationPanel>
  );
}
