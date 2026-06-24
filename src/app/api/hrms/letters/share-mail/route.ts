/**
 * HR Letter Share via Mail API
 *
 * POST: Share an issued letter via the Communication module's Gmail integration
 *
 * This creates pre-filled email data with the letter PDF path and provides
 * a deep link to the Communication module's mail composer.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    const { letterRequestId } = body;

    if (!letterRequestId) {
      return NextResponse.json({ error: "Letter request ID is required" }, { status: 400 });
    }

    // Find the letter request
    const letterRequest = await db.hRLetterRequest.findFirst({
      where: {
        id: letterRequestId,
        orgId,
        status: { in: ["ISSUED", "ACCEPTED"] },
      },
    });

    if (!letterRequest) {
      return NextResponse.json({
        error: "Letter not found or not yet issued",
      }, { status: 404 });
    }

    // Get the user details separately
    const employee = await db.user.findUnique({
      where: { id: letterRequest.userId },
      select: { id: true, name: true, email: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Get the template name
    const template = await db.hRLetterTemplate.findUnique({
      where: { id: letterRequest.templateId },
      select: { name: true, type: true },
    });

    // Get letter settings for email template
    const settings = await db.hRLetterSetting.findFirst({
      where: { orgId },
    });

    // Check if PDF exists
    const pdfPath = letterRequest.pdfPath;
    if (!pdfPath || !fs.existsSync(path.resolve(pdfPath))) {
      return NextResponse.json({
        error: "Letter PDF not generated yet. Please regenerate the PDF.",
      }, { status: 400 });
    }

    // Build email data
    const recipientEmail = employee.email;
    const recipientName = employee.name;
    const templateName = template?.name ?? "HR Letter";
    const letterNumber = letterRequest.letterNumber;

    // Use custom email template from settings, or fall back to default
    let emailSubject = `Your ${templateName} — ${letterNumber ?? ""}`.trim();
    let emailBody = settings?.emailTemplate
      ? (settings.emailTemplate as string)
          .replace(/\{\{employee_name\}\}/g, recipientName)
          .replace(/\{\{letter_type\}\}/g, templateName)
          .replace(/\{\{letter_number\}\}/g, letterNumber ?? "")
          .replace(/\{\{company_name\}\}/g, "Adarsh Shipping & Trading Co.")
      : `Dear ${recipientName},\n\nPlease find attached your ${templateName}${letterNumber ? ` (Ref: ${letterNumber})` : ""}.\n\nThis is an official document issued by the HR Department. Please review and retain it for your records.\n\nIf you have any questions, please contact the HR Department.\n\nRegards,\n${settings?.signatoryName ?? "HR Department"}\n${settings?.signatoryDesignation ?? ""}`;

    return NextResponse.json({
      ok: true,
      data: {
        recipient: {
          email: recipientEmail,
          name: recipientName,
        },
        subject: emailSubject,
        body: emailBody,
        attachment: {
          filename: `${templateName.replace(/\s+/g, "_")}_${letterNumber ?? "letter"}.pdf`,
          path: pdfPath,
        },
        letterRequestId,
        letterNumber,
        templateName,
        // Provide a deep link to the Communication module mail composer
        composerLink: `/communication/mail/compose?to=${encodeURIComponent(recipientEmail)}&subject=${encodeURIComponent(emailSubject)}&attachment=${encodeURIComponent(pdfPath)}`,
      },
    });
  } catch (error: any) {
    console.error("share-mail API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
