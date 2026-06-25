import { db } from "@/lib/db";

async function main() {
  const jobId = "cmqrro17f0000oobw6azlaxod";
  console.log("Checking job:", jobId);
  
  const job = await db.chaJob.findUnique({
    where: { id: jobId },
    include: {
      assignments: true,
    },
  });
  
  if (!job) {
    console.log("Job not found.");
    return;
  }
  
  console.log("Job primaryOwnerId:", job.primaryOwnerId);
  console.log("Job assignedManagerId:", job.assignedManagerId);
  console.log("Job Assignments:", job.assignments);
  
  if (job.primaryOwnerId) {
    const owner = await db.user.findUnique({
      where: { id: job.primaryOwnerId },
      select: { name: true, managerId: true, tlId: true },
    });
    console.log("Job Owner:", owner);
  }
  
  const settings = await db.chaSettings.findFirst({
    where: { orgId: job.orgId },
  });
  console.log("Settings selfApprovalAllowed:", settings?.selfApprovalAllowed);
  
  const permissions = await db.userRole.findMany({
    where: { role: { orgId: job.orgId } },
    include: {
      user: { select: { name: true, id: true } },
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });
  
  console.log("Users with checklist internal approve permission:");
  for (const userRole of permissions) {
    const hasPermission = userRole.role.permissions.some(
      (rp) => rp.permission.key === "cha.checklist.internal_approve"
    );
    if (hasPermission) {
      console.log(`- ${userRole.user.name} (ID: ${userRole.user.id}) via Role: ${userRole.role.name}`);
    }
  }

  console.log("All User Roles for this org:");
  for (const userRole of permissions) {
    console.log(`- User: ${userRole.user.name} (ID: ${userRole.user.id}), Role: ${userRole.role.name}`);
  }
}

main().catch((err) => console.error(err));
