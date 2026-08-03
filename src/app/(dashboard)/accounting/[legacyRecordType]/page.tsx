import { notFound, redirect } from "next/navigation";

import { resolveLegacyRecordTypePath } from "@/modules/accounting/legacy-record-type-routes";

export default async function AccountingLegacyRecordTypeRedirect({
  params,
}: {
  params: Promise<{ legacyRecordType: string }>;
}) {
  const { legacyRecordType } = await params;
  const canonicalPath = resolveLegacyRecordTypePath(legacyRecordType);

  if (!canonicalPath) {
    notFound();
  }

  redirect(canonicalPath);
}
