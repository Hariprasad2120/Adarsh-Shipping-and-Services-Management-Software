/* eslint-disable @typescript-eslint/no-explicit-any -- existing offline matcher consumes heterogeneous tool payloads and this Phase 4 pass only adds citation metadata around that flow */
// ─── Mona Local Request Engine ───────────────────────────────────────────────
//
// Local fallback engine to parse and reply to user queries when Gemini API
// is unavailable or rate-limited. Queries local database for workspace data
// and searches the static knowledge base.
//

import type { MonaContext, MonaChatResponse } from "./types";
import {
  createFaqCitation,
  createToolCitations,
} from "./citations";
import { HOW_TO_GUIDES, MONOLITH_MODULES, STATIC_FAQS } from "./knowledge-base";
import {
  searchMonaKnowledge,
  searchMonaKnowledgeForContext,
} from "./knowledge";
import { executeTool } from "./tools";

/**
 * Handles incoming chat messages locally.
 * Returns formatted markdown output using only lists, bold, italics, code, and links.
 */
export async function handleOfflineQuery(
  userMessage: string,
  ctx: MonaContext
): Promise<MonaChatResponse> {
  const query = userMessage.toLowerCase().trim();
  const toolsUsed: string[] = [];

  try {
    // 1. Handle Welcome / Proactive Insights (used for initial chat load)
    const isWelcome = 
      query.includes("greet me") || 
      query.includes("proactive insights") || 
      query.includes("my work today") ||
      query.includes("morning brief") ||
      query.includes("overdue blockers") ||
      query.includes("pending approvals") ||
      query.includes("waiting-for") ||
      query.includes("waiting for") ||
      query.includes("follow-up reminders") ||
      query.includes("follow ups") ||
      query.includes("needs my attention") || 
      query === "hi" || 
      query === "hello" || 
      query === "hey";

    if (isWelcome) {
      toolsUsed.push("getProactiveInsights");
      const res = (await executeTool("getProactiveInsights", {}, ctx)) as any;

      const firstName = ctx.userName.split(" ")[0];
      const intro = `Hello, **${firstName}**! 👋 Welcome back to Monolith Engine.\n\n` +
        `I am operating in **Offline Support Mode** since the primary Gemini AI service is currently unavailable. However, I can still query your database locally!\n\n`;
      const content = intro + buildOfflineProactiveBrief(res);

      return withToolCitations(ctx, content, toolsUsed);
    }

    // 2. Identify query category
    // Check if the query is asking "how to" or looking for instructions/guides
    const isHowTo = ["how", "guide", "step", "way", "process", "method", "policy", "apply", "create", "generate", "submit"].some(w => query.includes(w));

    // If it's a how-to query, prioritize matching How-To Guides
    if (isHowTo) {
      const guideRes = matchGuide(query);
      if (guideRes) return guideRes;
    }

    // 3. Dynamic Database-Backed Queries (using keyword matching)
    
    // Profile
    if (matchKeywords(query, ["profile", "who am i", "my details", "employee number", "my email", "my department", "designation", "manager", "name"])) {
      toolsUsed.push("getMyProfile");
      const res = (await executeTool("getMyProfile", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve your profile details: ${res.error}`, toolsUsed };
      }
      const content = `Here is your Monolith Employee Profile:\n` +
        `- **Name**: ${res.name}\n` +
        `- **Email**: ${res.email}\n` +
        `- **Designation**: ${res.designation}\n` +
        `- **Employee Number**: ${res.employeeNumber}\n` +
        `- **Department**: ${res.department}\n` +
        `- **Branch**: ${res.branch}\n` +
        `- **Reporting Manager**: ${res.manager}`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Attendance
    if (matchKeywords(query, ["attendance", "punch", "punches", "check in", "check-in", "check out", "check-out", "working hours", "work hours"])) {
      toolsUsed.push("getMyAttendance");
      const res = (await executeTool("getMyAttendance", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve your attendance status: ${res.error}`, toolsUsed };
      }
      let content = `Today's Attendance Status: **${res.today.status}**\n`;
      if (res.today.checkInTime) content += `- **Punch In**: ${res.today.checkInTime}\n`;
      if (res.today.checkOutTime) content += `- **Punch Out**: ${res.today.checkOutTime}\n`;
      if (res.today.workingHours !== null) content += `- **Working Hours Logged**: ${res.today.workingHours} hrs\n`;

      content += `\n**Recent Attendance Punches (Last 7 Days):**\n`;
      if (res.recentHistory && res.recentHistory.length > 0) {
        res.recentHistory.forEach((h: any) => {
          content += `- **${h.date}**: In ${h.checkIn} | Out ${h.checkOut} (${h.status})${h.workingHours ? ` - ${h.workingHours} hrs` : ""}\n`;
        });
      } else {
        content += `- No punches recorded in the last 7 days.\n`;
      }
      content += `\nYou can punch in/out or view complete logs at **/attendance/punch**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Leaves
    if (matchKeywords(query, ["leave", "leaves", "vacation", "holiday"])) {
      toolsUsed.push("getMyLeaves");
      const res = (await executeTool("getMyLeaves", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve your leave balance: ${res.error}`, toolsUsed };
      }
      let content = `Your Active Leave Balances:\n`;
      if (res.balances && res.balances.length > 0) {
        res.balances.forEach((b: any) => {
          content += `- **${b.type}**: ${b.balance} days\n`;
        });
      } else {
        content += `- No active leave allocations found.\n`;
      }

      content += `\n**Pending Leave Applications:**\n`;
      if (res.pendingRequests && res.pendingRequests.length > 0) {
        res.pendingRequests.forEach((r: any) => {
          content += `- **${r.type}** from ${r.from} to ${r.to} (${r.status}) - *Note: ${r.notes}*\n`;
        });
      } else {
        content += `- No pending leave applications.\n`;
      }
      content += `\nYou can request new leaves or verify balances at **/attendance/leaves**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Tasks
    if (matchKeywords(query, ["task", "tasks", "todo", "to-do", "checklist", "checklists"])) {
      toolsUsed.push("getMyTasks");
      const res = (await executeTool("getMyTasks", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve your tasks: ${res.error}`, toolsUsed };
      }
      let content = `You have **${res.summary.totalPending}** pending tasks.\n\n` +
        `**Personal To-Do Items** (${res.summary.todoCount}):\n`;
      if (res.todoTasks && res.todoTasks.length > 0) {
        res.todoTasks.forEach((t: any) => {
          content += `- [ ] ${t.title} (Due: ${t.dueDate})\n`;
        });
      } else {
        content += `- No pending personal to-do tasks.\n`;
      }

      content += `\n**HRMS Assigned Checklist Items** (${res.summary.hrmsCount}):\n`;
      if (res.hrmsTasks && res.hrmsTasks.length > 0) {
        res.hrmsTasks.forEach((t: any) => {
          content += `- [ ] ${t.title} (Priority: *${t.priority}* | Due: ${t.dueDate})\n`;
        });
      } else {
        content += `- No pending HRMS checklists.\n`;
      }
      content += `\nManage personal items at **/todo** or view team tasks at **/hrms/tasks**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Notifications
    if (matchKeywords(query, ["notification", "notifications", "unread"])) {
      toolsUsed.push("getMyNotifications");
      const res = (await executeTool("getMyNotifications", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve notifications: ${res.error}`, toolsUsed };
      }
      let content = `You have **${res.unreadCount}** unread notifications.\n\n**Recent Notifications:**\n`;
      if (res.recent && res.recent.length > 0) {
        res.recent.forEach((n: any) => {
          content += `- **${n.title}**: ${n.body} (*${n.time}*)${n.link ? ` [Link](${n.link})` : ""}\n`;
        });
      } else {
        content += `- No recent notifications.\n`;
      }
      content += `\nView full notifications center at **/notifications**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Help Desk / Support Cases
    if (matchKeywords(query, ["case", "cases", "ticket", "tickets", "helpdesk", "support"])) {
      toolsUsed.push("getMyHrCases");
      const res = (await executeTool("getMyHrCases", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve HR support cases: ${res.error}`, toolsUsed };
      }
      let content = `You have **${res.openCases}** open Support Cases.\n\n`;
      if (res.cases && res.cases.length > 0) {
        res.cases.forEach((c: any) => {
          content += `- **Case #${c.id.slice(-6)}**: ${c.title} (Status: *${c.status}* | Priority: *${c.priority}*)\n`;
        });
      } else {
        content += `- No open help desk support cases.\n`;
      }
      content += `\nFile a ticket or check update progress at **/hrms/helpdesk**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // CRM Leads Summary (requires crm.lead.read)
    if (matchKeywords(query, ["worth pursuing", "customer worth pursuing", "best customer to pursue", "pursue first"])) {
      if (!ctx.permissions.includes("crm.lead.read") || !ctx.permissions.includes("crm.deal.manage")) {
        return { content: "You do not have the CRM permissions required to review cross-module customer pursuit priorities.", toolsUsed };
      }
      toolsUsed.push("getCustomerWorthPursuing");
      const res = (await executeTool("getCustomerWorthPursuing", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't generate pursuit priorities: ${res.error}`, toolsUsed };
      }
      let content = `Customer Worth Pursuing\n`;
      if (res.headline) {
        content += `- **Headline**: ${res.headline}\n`;
      }
      content += `\n**Top Accounts**\n`;
      if (res.topAccounts?.length > 0) {
        res.topAccounts.forEach((account: any) => {
          content += `- **${account.accountName}**: ₹${Number(account.weightedPipelineValue).toLocaleString("en-IN")} weighted pipeline, ${account.openDeals} open deals, ${account.pendingQuotes} live quotes, ${account.overdueFollowUps} overdue follow-ups\n`;
          if (account.reasons?.length) {
            content += `  Reasons: ${account.reasons.join(" · ")}\n`;
          }
        });
      } else {
        content += `- No strong account pursuit signals found.\n`;
      }
      if (res.topProspects?.length > 0) {
        content += `\n**Prospects To Keep Warm**\n`;
        res.topProspects.forEach((lead: any) => {
          content += `- **${lead.company}** (${lead.status}, ${lead.rating})${lead.contactName ? ` · ${lead.contactName}` : ""}\n`;
        });
      }
      return withToolCitations(ctx, content, toolsUsed);
    }

    if (matchKeywords(query, ["quote follow up priority", "quotation follow up priority", "quotes need follow up", "quote sla"])) {
      if (!ctx.permissions.includes("crm.invoice.manage")) {
        return { content: "You do not have the quotation permissions required to review follow-up priorities.", toolsUsed };
      }
      toolsUsed.push("getQuoteFollowUpPriorities");
      const res = (await executeTool("getQuoteFollowUpPriorities", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't rank quote follow-up priorities: ${res.error}`, toolsUsed };
      }
      let content = `Quote Follow-up Priorities\n`;
      if (res.headline) {
        content += `- **Headline**: ${res.headline}\n`;
      }
      content += `\n**Priority Queue**\n`;
      if (res.prioritizedQuotes?.length > 0) {
        res.prioritizedQuotes.forEach((quote: any) => {
          content += `- **${quote.quoteNumber}** for ${quote.customerName}: ${quote.approvalStatus} · ₹${Number(quote.total).toLocaleString("en-IN")}\n`;
          if (quote.reasons?.length) {
            content += `  Reasons: ${quote.reasons.join(" · ")}\n`;
          }
        });
      } else {
        content += `- No quote follow-up priorities are active.\n`;
      }
      return withToolCitations(ctx, content, toolsUsed);
    }

    if (matchKeywords(query, ["job risk", "jobs at risk", "risk overview", "cha risk"])) {
      if (!ctx.permissions.includes("cha.job.read")) {
        return { content: "You do not have the CHA job permissions required to inspect job risk.", toolsUsed };
      }
      toolsUsed.push("getJobRiskOverview");
      const res = (await executeTool("getJobRiskOverview", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't generate the job risk overview: ${res.error}`, toolsUsed };
      }
      let content = `Job Risk Overview\n`;
      if (res.headline) {
        content += `- **Headline**: ${res.headline}\n`;
      }
      if (res.summary) {
        content += `- **High risk**: ${res.summary.highRisk}\n`;
        content += `- **Medium risk**: ${res.summary.mediumRisk}\n`;
        content += `- **Watch list**: ${res.summary.watchList}\n`;
      }
      content += `\n**At-Risk Jobs**\n`;
      if (res.atRiskJobs?.length > 0) {
        res.atRiskJobs.forEach((job: any) => {
          content += `- **${job.jobNumber}** · ${job.customerName} (${job.priority}/${job.stage})\n`;
          if (job.reasons?.length) {
            content += `  Reasons: ${job.reasons.join(" · ")}\n`;
          }
        });
      } else {
        content += `- No elevated job risks found.\n`;
      }
      return withToolCitations(ctx, content, toolsUsed);
    }

    if (matchKeywords(query, ["outstanding payment", "outstanding receivable", "receivables", "collections summary", "payment relationship"])) {
      if (!ctx.permissions.includes("accounting.journal.read") || !ctx.permissions.includes("crm.deal.manage")) {
        return { content: "You do not have the accounting and CRM permissions required to inspect outstanding-payment relationship summaries.", toolsUsed };
      }
      toolsUsed.push("getOutstandingPaymentRelationshipSummary");
      const res = (await executeTool("getOutstandingPaymentRelationshipSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't generate the receivables relationship summary: ${res.error}`, toolsUsed };
      }
      let content = `Outstanding Payment + Relationship Summary\n`;
      if (res.headline) {
        content += `- **Headline**: ${res.headline}\n`;
      }
      content += `\n**Priority Accounts**\n`;
      if (res.prioritizedAccounts?.length > 0) {
        res.prioritizedAccounts.forEach((account: any) => {
          content += `- **${account.customerName}**: ₹${Number(account.totalOutstanding).toLocaleString("en-IN")} outstanding, ${account.overdueInvoices} overdue invoices, ${account.openDeals} open deals\n`;
          if (account.reasons?.length) {
            content += `  Reasons: ${account.reasons.join(" · ")}\n`;
          }
        });
      } else {
        content += `- No receivables pressure signals found.\n`;
      }
      return withToolCitations(ctx, content, toolsUsed);
    }

    if (matchKeywords(query, ["lead", "leads"])) {
      if (!ctx.permissions.includes("crm.lead.read")) {
        return { content: "You do not have permission key `crm.lead.read` required to access CRM lead summaries.", toolsUsed };
      }
      toolsUsed.push("getCrmLeadsSummary");
      const res = (await executeTool("getCrmLeadsSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve lead statistics: ${res.error}`, toolsUsed };
      }
      let content = `CRM Leads Summary (Total Leads: **${res.totalLeads}**):\n\n**By Status:**\n`;
      res.byStatus.forEach((s: any) => {
        content += `- **${s.status}**: ${s.count}\n`;
      });
      content += `\n**Recent 5 Leads:**\n`;
      if (res.recentLeads && res.recentLeads.length > 0) {
        res.recentLeads.forEach((l: any) => {
          content += `- **${l.name}** - ${l.company} (${l.status} | Source: *${l.source}*)\n`;
        });
      } else {
        content += `- No lead records found.\n`;
      }
      content += `\nManage lead pipelines at **/crm/leads**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // CRM Deals Summary (requires crm.deal.manage)
    if (matchKeywords(query, ["deal", "deals", "pipeline"])) {
      if (!ctx.permissions.includes("crm.deal.manage")) {
        return { content: "You do not have permission key `crm.deal.manage` required to access CRM deal pipeline summaries.", toolsUsed };
      }
      toolsUsed.push("getCrmDealsSummary");
      const res = (await executeTool("getCrmDealsSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve deals details: ${res.error}`, toolsUsed };
      }
      let content = `CRM Deals Summary (Total Deals: **${res.totalDeals}**):\n\n**By Stage:**\n`;
      res.byStage.forEach((s: any) => {
        content += `- **${s.stage}**: ${s.count} deals (Total Value: ₹${s.totalValue.toLocaleString("en-IN")})\n`;
      });
      content += `\n**Highest Value Deals:**\n`;
      if (res.topDeals && res.topDeals.length > 0) {
        res.topDeals.forEach((d: any) => {
          content += `- **${d.name}**: ₹${d.amount.toLocaleString("en-IN")} (${d.stage} | Est. Close: ${d.expectedCloseDate})\n`;
        });
      } else {
        content += `- No deals found in CRM.\n`;
      }
      content += `\nInspect pipeline kanban cards at **/crm/deals**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // CRM Enquiries Summary
    if (matchKeywords(query, ["enquiry", "enquiries", "inquiry", "pricing", "rate request"])) {
      if (!ctx.permissions.includes("crm.lead.read")) {
        return { content: "You do not have permission key `crm.lead.read` required to access CRM enquiry summaries.", toolsUsed };
      }
      toolsUsed.push("getCrmEnquiriesSummary");
      const res = (await executeTool("getCrmEnquiriesSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve enquiry summaries: ${res.error}`, toolsUsed };
      }
      let content = `CRM Enquiries Summary (Total Enquiries: **${res.totalEnquiries}**)\n\n**By Status:**\n`;
      res.byStatus.forEach((entry: any) => {
        content += `- **${entry.status}**: ${entry.count}\n`;
      });
      content += `\n**By Service Type:**\n`;
      res.byServiceType.forEach((entry: any) => {
        content += `- **${entry.serviceType}**: ${entry.count}\n`;
      });
      content += `\n**Recent Enquiries:**\n`;
      if (res.recentEnquiries.length > 0) {
        res.recentEnquiries.forEach((entry: any) => {
          content += `- **${entry.enquiryRef}** · ${entry.company} (${entry.serviceType} | ${entry.status})\n`;
        });
      } else {
        content += `- No recent enquiries found.\n`;
      }
      content += `\nReview the live workflow at **/crm/enquiries**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // CRM Quotes Summary
    if (matchKeywords(query, ["quote", "quotes", "quotation", "quotations"])) {
      if (!ctx.permissions.includes("crm.invoice.manage")) {
        return { content: "You do not have permission key `crm.invoice.manage` required to access CRM quotation summaries.", toolsUsed };
      }
      toolsUsed.push("getCrmQuotesSummary");
      const res = (await executeTool("getCrmQuotesSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve quotation summaries: ${res.error}`, toolsUsed };
      }
      let content = `CRM Quotes Summary (Total Quotes: **${res.totalQuotes}** | Total Value: **₹${Number(res.totalQuotedValue).toLocaleString("en-IN")}**)\n\n**By Approval Status:**\n`;
      res.byApprovalStatus.forEach((entry: any) => {
        content += `- **${entry.status}**: ${entry.count} (₹${Number(entry.totalValue).toLocaleString("en-IN")})\n`;
      });
      content += `\n**Recent Quotes:**\n`;
      if (res.recentQuotes.length > 0) {
        res.recentQuotes.forEach((entry: any) => {
          content += `- **${entry.quoteNumber}** for ${entry.customerName} (${entry.approvalStatus} | ₹${Number(entry.total).toLocaleString("en-IN")})\n`;
        });
      } else {
        content += `- No recent quotes found.\n`;
      }
      content += `\nReview the quotation workspace at **/crm/quotes**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Team Attendance Summary (requires attendance.punch.manage)
    if (matchKeywords(query, ["team attendance", "attendance summary", "who is in", "attendance rate", "absent count"])) {
      if (!ctx.permissions.includes("attendance.punch.manage")) {
        return { content: "You do not have permission key `attendance.punch.manage` required to view team attendance summaries.", toolsUsed };
      }
      toolsUsed.push("getTeamAttendanceSummary");
      const res = (await executeTool("getTeamAttendanceSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve team attendance details: ${res.error}`, toolsUsed };
      }
      const content = `Team Attendance Summary for **${res.date}**:\n` +
        `- **Total Active Employees**: ${res.totalEmployees}\n` +
        `- **Checked In**: ${res.checkedIn}\n` +
        `- **Checked Out**: ${res.checkedOut}\n` +
        `- **Absent**: ${res.absent}\n` +
        `- **Daily Attendance Rate**: ${res.attendanceRate}%\n\n` +
        `Analyze attendance reports at **/attendance/reports**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Letter Templates (requires hrms.letters.manage)
    if (matchKeywords(query, ["letter", "letters", "template", "templates"])) {
      if (!ctx.permissions.includes("hrms.letters.manage")) {
        return { content: "You do not have permission key `hrms.letters.manage` required to view letter templates.", toolsUsed };
      }
      toolsUsed.push("getLetterTemplates");
      const res = (await executeTool("getLetterTemplates", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve letter templates: ${res.error}`, toolsUsed };
      }
      let content = `Available HR Letter Templates (${res.count} items):\n`;
      res.templates.forEach((t: any) => {
        content += `- **${t.name}** (Type: *${t.type}* | Status: ${t.isActive ? "Active" : "Inactive"})\n`;
      });
      content += `\nManage templates and issue new letters at **/hrms/letters**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Communication Workspace
    if (matchKeywords(query, ["mail", "email", "communication", "chat", "inbox", "thread"])) {
      if (!ctx.permissions.includes("communication.mail.access")) {
        return { content: "You do not have the communication mail access required to inspect communication workspace summaries.", toolsUsed };
      }
      toolsUsed.push("getCommunicationSummary");
      const res = (await executeTool("getCommunicationSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve communication activity: ${res.error}`, toolsUsed };
      }
      let content = `Communication Workspace Summary\n` +
        `- **Org events in last 14 days**: ${res.totalEventsLast14Days}\n` +
        `- **Your events in last 14 days**: ${res.myEventsLast14Days}\n\n` +
        `**Recent Activity:**\n`;
      if (res.recentActions.length > 0) {
        res.recentActions.forEach((entry: any) => {
          content += `- **${entry.action}** on ${entry.createdAt}: ${entry.details}\n`;
        });
      } else {
        content += `- No recent communication activity recorded.\n`;
      }
      content += `\nOpen the workspace at **/communication**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // Accounting Workspace
    if (matchKeywords(query, ["accounting", "finance", "journal", "payment entry", "payments"])) {
      if (!ctx.permissions.includes("accounting.journal.read")) {
        return { content: "You do not have the accounting read access required to inspect finance summaries.", toolsUsed };
      }
      toolsUsed.push("getAccountingSummary");
      const res = (await executeTool("getAccountingSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve accounting summaries: ${res.error}`, toolsUsed };
      }
      let content = `Accounting Summary\n\n**Document Statuses:**\n`;
      res.documentStatuses.forEach((entry: any) => {
        content += `- **${entry.status}**: ${entry.count} (₹${Number(entry.totalAmount).toLocaleString("en-IN")})\n`;
      });
      content += `\n**Payment Statuses:**\n`;
      res.paymentStatuses.forEach((entry: any) => {
        content += `- **${entry.status}**: ${entry.count}\n`;
      });
      content += `\n**Recent Documents:**\n`;
      if (res.recentDocuments.length > 0) {
        res.recentDocuments.forEach((entry: any) => {
          content += `- **${entry.documentType}** (${entry.status}) on ${entry.postingDate} · ₹${Number(entry.totalAmount).toLocaleString("en-IN")}\n`;
        });
      } else {
        content += `- No recent accounting documents found.\n`;
      }
      content += `\nOpen finance workspaces at **/accounting**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // CHA Jobs / Operations
    if (matchKeywords(query, ["cha", "job", "jobs", "filing", "checklist", "clearance"])) {
      if (!ctx.permissions.includes("cha.job.read")) {
        return { content: "You do not have the CHA job access required to inspect operations summaries.", toolsUsed };
      }
      toolsUsed.push("getChaJobsSummary");
      const res = (await executeTool("getChaJobsSummary", {}, ctx)) as any;
      if (res.error) {
        return { content: `I couldn't retrieve CHA job summaries: ${res.error}`, toolsUsed };
      }
      let content = `CHA Jobs Summary (Total Jobs: **${res.totalJobs}**)\n\n**By Stage:**\n`;
      res.byStage.forEach((entry: any) => {
        content += `- **${entry.stage}**: ${entry.count}\n`;
      });
      content += `\n**By Priority:**\n`;
      res.byPriority.forEach((entry: any) => {
        content += `- **${entry.priority}**: ${entry.count}\n`;
      });
      content += `\n**Recent Jobs:**\n`;
      if (res.recentJobs.length > 0) {
        res.recentJobs.forEach((entry: any) => {
          content += `- **${entry.jobNumber}** · ${entry.title} (${entry.stage} | ${entry.priority})\n`;
        });
      } else {
        content += `- No recent CHA jobs found.\n`;
      }
      content += `\nOpen the operations workspace at **/cha/jobs**`;
      return withToolCitations(ctx, content, toolsUsed);
    }

    // If it's NOT a how-to query, but we didn't match a DB trigger, try How-To Guides now
    if (!isHowTo) {
      const guideRes = matchGuide(query);
      if (guideRes) return guideRes;
    }

    // 4. Static FAQ and module knowledge retrieval
    const knowledgeHit = searchMonaKnowledge(query, 1)[0];
    if (knowledgeHit?.kind === "faq") {
      const faq = STATIC_FAQS.find(
        (item) => knowledgeHit.id === `faq:${item.question.toLowerCase().replace(/\s+/g, "-")}`,
      );
      if (faq) {
        return {
          content: faq.answer,
          toolsUsed,
          citations: [knowledgeHit.citation],
        };
      }
    }

    if (knowledgeHit?.kind === "module") {
      const moduleRes = buildModuleResponse(knowledgeHit.title, toolsUsed);
      if (moduleRes) {
        return moduleRes;
      }
    }

    const contextualKnowledgeHit = await searchMonaKnowledgeForContext({
      query: userMessage,
      limit: 1,
      orgId: ctx.orgId,
      permissions: ctx.permissions,
      userId: ctx.userId,
    });
    if (contextualKnowledgeHit[0]?.kind === "document") {
      return {
        content:
          `I found an approved internal template that looks relevant:\n` +
          `- **${contextualKnowledgeHit[0].title}**\n` +
          `- ${contextualKnowledgeHit[0].summary}\n\n` +
          `Open **/hrms/letters** to review or use this template.`,
        toolsUsed,
        citations: [contextualKnowledgeHit[0].citation],
      };
    }

    // 5. Generic Offline Help / Capability Request
    if (query.includes("help") || query.includes("can you do") || query.includes("capabilities") || query.includes("what can you")) {
      const content = `### Mona's Offline Capabilities\n` +
        `I am running in **Offline Support Mode**. The primary Gemini AI is currently unavailable, but I can assist you with:\n\n` +
        `**Personal Workspace Queries (Live Database):**\n` +
        `- View your profile detail: *who am I* / *profile*\n` +
        `- Check daily check-ins: *my attendance* / *punches*\n` +
        `- Verify leave allocations: *my leaves* / *leave balance*\n` +
        `- List active reminders: *my tasks* / *todo*\n` +
        `- View recent logs: *my notifications*\n` +
        `- Check unresolved tickets: *my cases*\n\n` +
        `**Operations & Guides (Static Knowledge):**\n` +
        `- How do I apply for leave?\n` +
        `- How do I mark attendance?\n` +
        `- How do I create a job opening in Recruit?\n` +
        `- What is the CRM module?\n` +
        `- What are the keyboard shortcuts?\n\n` +
        `Type any of these commands to get started!`;
      return {
        content,
        toolsUsed,
        citations: [createFaqCitation({
          question: "Mona's offline capabilities",
          answer: content,
          keywords: ["offline", "capabilities", "help"],
        })],
      };
    }

    // 6. Default Friendly Offline Fallback
    const content = `I am currently operating in **Offline Support Mode** because the primary Gemini AI service is rate-limited or offline.\n\n` +
      `I couldn't quite resolve your request: *"${userMessage}"* with my local rule-engine. However, I can still help you retrieve live database items and navigate Monolith modules!\n\n` +
      `**Try asking me one of the following:**\n` +
      `- *Show my pending tasks*\n` +
      `- *What is my check-in status?*\n` +
      `- *How do I apply for leave?*\n` +
      `- *How do I create a job opening in Recruit?*\n` +
      `- *Navigate to CRM dashboard*\n` +
      `- *Show my leave balance*`;

    return { content, toolsUsed };

  } catch (err) {
    console.error("[Mona Local Engine] Execution error:", err);
    return {
      content: `I encountered an unexpected error while retrieving your workspace details locally. Please try again.`,
      toolsUsed,
    };
  }
}

/**
 * Returns true if the query contains any of the search keywords.
 */
function matchKeywords(query: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    if (kw.includes(" ")) {
      const words = kw.toLowerCase().split(" ");
      return words.every((w) => query.includes(w));
    }
    return query.includes(kw.toLowerCase());
  });
}

/**
 * Helper to match a how-to guide based on keyword phrase overlap scoring.
 */
function matchGuide(query: string): MonaChatResponse | null {
  const bestHit = searchMonaKnowledge(query, 1)[0];
  if (bestHit?.kind !== "guide") {
    return null;
  }

  const guide = HOW_TO_GUIDES.find(
    (item) => bestHit.id === `guide:${item.title.toLowerCase().replace(/\s+/g, "-")}`,
  );
  if (!guide) {
    return null;
  }

  let content = `### ${guide.title}\n\n`;
  guide.steps.forEach((step, idx) => {
    content += `${idx + 1}. ${step}\n`;
  });
  if (guide.path) {
    content += `\nDirect page link: ${guide.path}`;
  }

  return {
    content,
    toolsUsed: [],
    citations: [bestHit.citation],
  };
}

function buildModuleResponse(
  moduleTitle: string,
  toolsUsed: string[],
): MonaChatResponse | null {
  const moduleInfo = MONOLITH_MODULES.find((item) => item.name === moduleTitle);
  if (!moduleInfo) {
    return null;
  }

  let content = `### Module: ${moduleInfo.name}\n` +
    `**Overview**: ${moduleInfo.description}\n\n` +
    `**Features Available:**\n`;
  moduleInfo.features.forEach((feature) => {
    content += `- ${feature}\n`;
  });
  content += `\nLink to module: ${moduleInfo.path}`;

  const knowledgeHit = searchMonaKnowledge(moduleInfo.name, 1)[0];
  return {
    content,
    toolsUsed,
    citations: knowledgeHit ? [knowledgeHit.citation] : undefined,
  };
}

function withToolCitations(
  ctx: MonaContext,
  content: string,
  toolsUsed: string[],
): MonaChatResponse {
  return {
    content,
    toolsUsed,
    citations: createToolCitations(toolsUsed, ctx),
  };
}

function buildOfflineProactiveBrief(res: any): string {
  const brief = res?.brief;
  const sections = brief?.sections;
  let content = "";

  if (brief?.headline) {
    content += `**Morning brief:** ${brief.headline}\n\n`;
  } else {
    content += `**Here is what needs your attention today:**\n`;
  }

  if (brief?.myWorkToday) {
    content += `**My Work Today**\n`;
    content += `- **Overdue blockers**: ${brief.myWorkToday.overdueBlockers}\n`;
    content += `- **Approvals waiting**: ${brief.myWorkToday.approvalsWaiting}\n`;
    content += `- **Follow-ups due**: ${brief.myWorkToday.followUpsDue}\n`;
    content += `- **Waiting-for items**: ${brief.myWorkToday.waitingFor}\n`;
      content += `- **Unread notifications**: ${brief.myWorkToday.unreadNotifications}\n\n`;
    }

  content += renderOfflineSection("Overdue blockers", sections?.overdueBlockers);
  content += renderOfflineSection("Pending approvals", sections?.pendingApprovals);
  content += renderOfflineSection("Follow-up reminders", sections?.followUps);
  content += renderOfflineSection("Waiting-for items", sections?.waitingFor);

  if (res?.insights?.length > 0) {
    content += `**Quick signals**\n`;
    res.insights.forEach((insight: string) => {
      content += `- ${insight}\n`;
    });
    content += `\n`;
  }

  if (!brief?.headline && (!res?.insights || res.insights.length === 0)) {
    content += `- ✅ You are completely caught up! No urgent alerts.\n\n`;
  }

  content += `Ask me about your **tasks**, **attendance**, **leaves**, **approvals**, or Monolith **how-to guides**.`;
  return content;
}

function renderOfflineSection(
  title: string,
  items: Array<{ title: string; detail: string; href?: string }> | undefined,
) {
  if (!items || items.length === 0) {
    return "";
  }

  let content = `**${title}**\n`;
  items.forEach((item) => {
    content += `- **${item.title}**: ${item.detail}${item.href ? ` (${item.href})` : ""}\n`;
  });
  content += `\n`;
  return content;
}
