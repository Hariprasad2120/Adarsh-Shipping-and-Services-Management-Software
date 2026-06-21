// ─── Mona Local Request Engine ───────────────────────────────────────────────
//
// Local fallback engine to parse and reply to user queries when Gemini API
// is unavailable or rate-limited. Queries local database for workspace data
// and searches the static knowledge base.
//

import type { MonaContext, MonaChatResponse } from "./types";
import { executeTool } from "./tools";
import { MONOLITH_MODULES, HOW_TO_GUIDES, STATIC_FAQS } from "./knowledge-base";

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
      query.includes("needs my attention") || 
      query === "hi" || 
      query === "hello" || 
      query === "hey";

    if (isWelcome) {
      toolsUsed.push("getProactiveInsights");
      const res = (await executeTool("getProactiveInsights", {}, ctx)) as any;
      
      let insightBlock = "";
      if (res && res.insights && res.insights.length > 0) {
        res.insights.forEach((ins: string) => {
          insightBlock += `- ${ins}\n`;
        });
      } else {
        insightBlock += `- ✅ You are completely caught up! No urgent alerts.\n`;
      }

      const firstName = ctx.userName.split(" ")[0];
      const content = `Hello, **${firstName}**! 👋 Welcome back to Monolith Engine.\n\n` +
        `I am operating in **Offline Support Mode** since the primary Gemini AI service is currently unavailable. However, I can still query your database locally!\n\n` +
        `**Here is what needs your attention today:**\n${insightBlock}\n` +
        `Ask me about your **tasks**, **attendance**, **leaves**, or search the platform **features** and **how-to guides**!`;

      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
    }

    // CRM Leads Summary (requires crm.lead.read)
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
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
      return { content, toolsUsed };
    }

    // If it's NOT a how-to query, but we didn't match a DB trigger, try How-To Guides now
    if (!isHowTo) {
      const guideRes = matchGuide(query);
      if (guideRes) return guideRes;
    }

    // 4. Static FAQ Matching
    for (const faq of STATIC_FAQS) {
      if (matchKeywords(query, faq.keywords)) {
        return { content: faq.answer, toolsUsed };
      }
    }

    // 5. Monolith Module Info Matching
    let bestModule = null;
    for (const mod of MONOLITH_MODULES) {
      if (query.includes(mod.name.toLowerCase().split(" ")[0]) || query.includes(mod.name.toLowerCase())) {
        bestModule = mod;
        break;
      }
    }

    if (bestModule) {
      let content = `### Module: ${bestModule.name}\n` +
        `**Overview**: ${bestModule.description}\n\n` +
        `**Features Available:**\n`;
      bestModule.features.forEach((feat) => {
        content += `- ${feat}\n`;
      });
      content += `\nLink to module: ${bestModule.path}`;
      return { content, toolsUsed };
    }

    // 6. Generic Offline Help / Capability Request
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
      return { content, toolsUsed };
    }

    // 7. Default Friendly Offline Fallback
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
  let bestGuide = null;
  let bestGuideScore = 0;

  for (const guide of HOW_TO_GUIDES) {
    let score = 0;
    for (const kw of guide.keywords) {
      if (kw.includes(" ")) {
        const words = kw.toLowerCase().split(" ");
        if (words.every((w) => query.includes(w))) {
          score += 1.5; // High weight for phrase alignment
        }
      } else if (query.includes(kw.toLowerCase())) {
        score += 1.0;
      }
    }
    if (score > bestGuideScore) {
      bestGuideScore = score;
      bestGuide = guide;
    }
  }

  // Minimum threshold score to resolve guide
  if (bestGuide && bestGuideScore >= 1.5) {
    let content = `### ${bestGuide.title}\n\n`;
    bestGuide.steps.forEach((step, idx) => {
      content += `${idx + 1}. ${step}\n`;
    });
    if (bestGuide.path) {
      content += `\nDirect page link: ${bestGuide.path}`;
    }
    return { content, toolsUsed: [] };
  }

  return null;
}
