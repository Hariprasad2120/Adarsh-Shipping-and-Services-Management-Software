import { describe, expect, it, vi } from "vitest";
import {
  buildCreateTaskProposal,
  buildDraftEmailProposal,
  executeConfirmedMonaAction,
  MonaActionError,
} from "@/modules/mona/actions";
import type { MonaContext } from "@/modules/mona/types";

function buildContext(overrides?: Partial<MonaContext>): MonaContext {
  return {
    userId: "user-1",
    userName: "Test User",
    orgId: "org-1",
    currentPath: "/dashboard",
    permissions: [],
    isAdmin: false,
    route: {
      channel: "web",
      path: "/dashboard",
      moduleId: "dashboard",
      moduleLabel: "Dashboard",
      pageLabel: "Dashboard",
      pageSummary: "Overview",
      breadcrumbs: ["Dashboard"],
      view: "dashboard",
      routeKey: "dashboard",
    },
    workspace: {
      permissionCount: 0,
      accessibleModules: ["dashboard"],
      roleSummary: "Employee",
    },
    entity: null,
    ...overrides,
  };
}

describe("Mona action confirmation hardening", () => {
  it("rejects tampered confirmation tokens", async () => {
    const proposal = buildCreateTaskProposal(
      { title: "Follow up customer" },
      buildContext(),
    );
    const tamperedToken = `${proposal.token.slice(0, -1)}x`;

    await expect(
      executeConfirmedMonaAction({
        ctx: buildContext(),
        token: tamperedToken,
      }),
    ).rejects.toMatchObject({
      name: "MonaActionError",
      status: 400,
    } satisfies Partial<MonaActionError>);
  });

  it("rejects action proposals that belong to a different user", async () => {
    const proposal = buildCreateTaskProposal(
      { title: "Review SLA blockers" },
      buildContext({ userId: "user-1" }),
    );

    await expect(
      executeConfirmedMonaAction({
        ctx: buildContext({ userId: "user-2" }),
        token: proposal.token,
      }),
    ).rejects.toMatchObject({
      name: "MonaActionError",
      status: 403,
    } satisfies Partial<MonaActionError>);
  });

  it("rejects expired action proposals", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(new Date("2026-08-27T09:00:00+05:30").getTime());
    const proposal = buildCreateTaskProposal(
      { title: "Escalate delay" },
      buildContext(),
    );

    nowSpy.mockReturnValue(new Date("2026-08-27T09:20:00+05:30").getTime());

    await expect(
      executeConfirmedMonaAction({
        ctx: buildContext(),
        token: proposal.token,
      }),
    ).rejects.toMatchObject({
      name: "MonaActionError",
      status: 410,
    } satisfies Partial<MonaActionError>);

    nowSpy.mockRestore();
  });

  it("enforces communication access again at execution time", async () => {
    const proposal = buildDraftEmailProposal(
      {
        to: "customer@example.com",
        subject: "Update",
        body: "Hello there",
      },
      buildContext({
        permissions: ["communication.mail.access"],
      }),
    );

    await expect(
      executeConfirmedMonaAction({
        ctx: buildContext(),
        token: proposal.token,
      }),
    ).rejects.toMatchObject({
      name: "MonaActionError",
      status: 403,
    } satisfies Partial<MonaActionError>);
  });
});
