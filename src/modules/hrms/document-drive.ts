import { db } from "@/lib/db";
import {
  createFolder,
  deleteFileOrFolder,
  downloadFile,
  findFolders,
  folderExists,
  getDriveAccessTokenForOrg,
  uploadFile,
} from "@/lib/google-drive-client";
import { loadUserPermissions } from "@/lib/rbac";

export const HR_DOCUMENT_CATEGORIES = [
  "MY_SPACE",
  "COMPANY_FILES",
  "EMPLOYEE_SHARED",
] as const;

export type HrDocumentCategory = (typeof HR_DOCUMENT_CATEGORIES)[number];

const ROOT_FOLDER_NAME = "Monolith HR Document Drive";
const CATEGORY_FOLDER_NAMES: Record<HrDocumentCategory, string> = {
  MY_SPACE: "My Space Files",
  COMPANY_FILES: "Company Files",
  EMPLOYEE_SHARED: "Employee Shared",
};
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const HR_ADMIN_PERMISSIONS = [
  "hrms.peopleplus.admin",
  "hrms.documents.upload",
  "admin.org.manage",
];

type EmployeeTarget = {
  id: string;
  name: string;
  employeeNumber: number | null;
};

type AccessActor = {
  id: string;
  isHrAdmin: boolean;
};

export class HrDocumentDriveError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "HrDocumentDriveError";
  }
}

export function isHrDocumentCategory(
  value: string | null | undefined,
): value is HrDocumentCategory {
  return HR_DOCUMENT_CATEGORIES.includes(value as HrDocumentCategory);
}

export function buildEmployeeDriveFolderName(employee: EmployeeTarget) {
  const safeName =
    employee.name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Employee";
  const employeeId = employee.employeeNumber ?? employee.id;
  return `${safeName} - ID ${employeeId}`;
}

export function canReadHrDocument(params: {
  actor: AccessActor;
  category: HrDocumentCategory;
  ownerId: string | null;
  ownerManagerId?: string | null;
  ownerTlId?: string | null;
}) {
  if (params.category === "COMPANY_FILES") return true;
  if (params.ownerId === params.actor.id) return true;
  if (params.category === "MY_SPACE") return false;
  return (
    params.actor.isHrAdmin ||
    params.ownerManagerId === params.actor.id ||
    params.ownerTlId === params.actor.id
  );
}

export function canUploadHrDocument(params: {
  actor: AccessActor;
  category: HrDocumentCategory;
  ownerId: string | null;
}) {
  if (params.category === "COMPANY_FILES") {
    return params.actor.isHrAdmin;
  }
  if (params.category === "MY_SPACE") {
    return params.ownerId === params.actor.id;
  }
  return params.actor.isHrAdmin || params.ownerId === params.actor.id;
}

function sanitizeFileName(name: string) {
  const sanitized = name
    .replace(/[\\/\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || "document";
}

async function getActor(userId: string, orgId: string) {
  const [user, permissions] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, orgId, active: true },
      select: {
        id: true,
        name: true,
        employeeNumber: true,
      },
    }),
    loadUserPermissions(userId),
  ]);

  if (!user) {
    throw new HrDocumentDriveError(
      "Your employee account is not active in this organisation.",
      403,
      "FORBIDDEN",
    );
  }

  return {
    ...user,
    isHrAdmin: HR_ADMIN_PERMISSIONS.some((key) => permissions.has(key)),
  };
}

async function getAccessibleEmployeeTargets(
  orgId: string,
  actor: AccessActor,
): Promise<EmployeeTarget[]> {
  return db.user.findMany({
    where: actor.isHrAdmin
      ? { orgId, active: true }
      : {
          orgId,
          active: true,
          OR: [
            { id: actor.id },
            { managerId: actor.id },
            { tlId: actor.id },
          ],
        },
    orderBy: [{ name: "asc" }, { employeeNumber: "asc" }],
    select: {
      id: true,
      name: true,
      employeeNumber: true,
    },
  });
}

async function resolveEmployeeTarget(params: {
  orgId: string;
  actor: AccessActor;
  requestedOwnerId?: string | null;
}) {
  const targets = await getAccessibleEmployeeTargets(params.orgId, params.actor);
  const ownerId = params.requestedOwnerId || params.actor.id;
  const target = targets.find((employee) => employee.id === ownerId);

  if (!target) {
    throw new HrDocumentDriveError(
      "You do not have access to this employee document folder.",
      403,
      "FORBIDDEN",
    );
  }

  return { target, targets };
}

async function ensureNamedFolder(params: {
  name: string;
  parentFolderId: string;
  sharedDriveId?: string;
  cachedFolderId?: string | null;
  accessToken: string;
}) {
  if (
    params.cachedFolderId &&
    (await folderExists(params.cachedFolderId, params.accessToken).catch(
      () => false,
    ))
  ) {
    return params.cachedFolderId;
  }

  const matches = await findFolders({
    name: params.name,
    parentFolderId: params.parentFolderId,
    driveId: params.sharedDriveId,
    accessToken: params.accessToken,
  });
  if (matches[0]?.id) return matches[0].id;

  return createFolder({
    name: params.name,
    parentFolderId: params.parentFolderId,
    sharedDriveId: params.sharedDriveId,
    accessToken: params.accessToken,
  });
}

async function ensureDriveHierarchy(orgId: string, actorId: string) {
  const [settings, existingConfig, accessToken] = await Promise.all([
    db.googleWorkspaceSetting.findUnique({ where: { orgId } }),
    db.hrDocumentDriveConfig.findUnique({ where: { orgId } }),
    getDriveAccessTokenForOrg(orgId, actorId),
  ]);
  const sharedDriveId =
    settings?.sharedDriveId || process.env.GOOGLE_SHARED_DRIVE_ID;

  if (!sharedDriveId) {
    throw new HrDocumentDriveError(
      "The organisation Shared Drive is not configured. Add it in Communication settings before uploading HR documents.",
      503,
      "DRIVE_NOT_CONFIGURED",
    );
  }

  const canReuseConfig = existingConfig?.sharedDriveId === sharedDriveId;
  const rootFolderId = await ensureNamedFolder({
    name: ROOT_FOLDER_NAME,
    parentFolderId: sharedDriveId,
    sharedDriveId,
    cachedFolderId: canReuseConfig ? existingConfig?.rootFolderId : null,
    accessToken,
  });

  const [mySpaceFolderId, companyFilesFolderId, employeeSharedFolderId] =
    await Promise.all([
      ensureNamedFolder({
        name: CATEGORY_FOLDER_NAMES.MY_SPACE,
        parentFolderId: rootFolderId,
        sharedDriveId,
        cachedFolderId: canReuseConfig
          ? existingConfig?.mySpaceFolderId
          : null,
        accessToken,
      }),
      ensureNamedFolder({
        name: CATEGORY_FOLDER_NAMES.COMPANY_FILES,
        parentFolderId: rootFolderId,
        sharedDriveId,
        cachedFolderId: canReuseConfig
          ? existingConfig?.companyFilesFolderId
          : null,
        accessToken,
      }),
      ensureNamedFolder({
        name: CATEGORY_FOLDER_NAMES.EMPLOYEE_SHARED,
        parentFolderId: rootFolderId,
        sharedDriveId,
        cachedFolderId: canReuseConfig
          ? existingConfig?.employeeSharedFolderId
          : null,
        accessToken,
      }),
    ]);

  const config = await db.hrDocumentDriveConfig.upsert({
    where: { orgId },
    create: {
      orgId,
      sharedDriveId,
      rootFolderId,
      mySpaceFolderId,
      companyFilesFolderId,
      employeeSharedFolderId,
    },
    update: {
      sharedDriveId,
      rootFolderId,
      mySpaceFolderId,
      companyFilesFolderId,
      employeeSharedFolderId,
    },
  });

  return { accessToken, config };
}

async function ensureEmployeeFolder(params: {
  orgId: string;
  actorId: string;
  category: "MY_SPACE" | "EMPLOYEE_SHARED";
  employee: EmployeeTarget;
}) {
  const [{ accessToken, config }, cachedFolder] = await Promise.all([
    ensureDriveHierarchy(params.orgId, params.actorId),
    db.hrDocumentFolder.findUnique({
      where: {
        orgId_ownerId_category: {
          orgId: params.orgId,
          ownerId: params.employee.id,
          category: params.category,
        },
      },
    }),
  ]);
  const displayName = buildEmployeeDriveFolderName(params.employee);
  const parentFolderId =
    params.category === "MY_SPACE"
      ? config.mySpaceFolderId
      : config.employeeSharedFolderId;
  const driveFolderId = await ensureNamedFolder({
    name: displayName,
    parentFolderId,
    sharedDriveId: config.sharedDriveId,
    cachedFolderId: cachedFolder?.driveFolderId,
    accessToken,
  });

  await db.hrDocumentFolder.upsert({
    where: {
      orgId_ownerId_category: {
        orgId: params.orgId,
        ownerId: params.employee.id,
        category: params.category,
      },
    },
    create: {
      orgId: params.orgId,
      ownerId: params.employee.id,
      category: params.category,
      driveFolderId,
      displayName,
    },
    update: {
      driveFolderId,
      displayName,
    },
  });

  return { accessToken, driveFolderId };
}

async function getStorageStatus(orgId: string) {
  const [settings, connections] = await Promise.all([
    db.googleWorkspaceSetting.findUnique({
      where: { orgId },
      select: { sharedDriveId: true },
    }),
    db.googleWorkspaceConnection.findMany({
      where: { orgId, status: "connected" },
      select: { scopes: true },
    }),
  ]);
  const hasDriveConnection = connections.some((connection) =>
    connection.scopes.some(
      (scope) =>
        scope === "https://www.googleapis.com/auth/drive" ||
        scope === "https://www.googleapis.com/auth/drive.file",
    ),
  );

  return {
    configured: Boolean(
      (settings?.sharedDriveId || process.env.GOOGLE_SHARED_DRIVE_ID) &&
        hasDriveConnection,
    ),
  };
}

export async function listHrDocuments(params: {
  orgId: string;
  actorId: string;
  category: HrDocumentCategory;
  ownerId?: string | null;
  search?: string | null;
}) {
  const actor = await getActor(params.actorId, params.orgId);
  let owner: EmployeeTarget | null = null;
  let employeeTargets: EmployeeTarget[] = [];

  if (params.category === "MY_SPACE") {
    owner = {
      id: actor.id,
      name: actor.name,
      employeeNumber: actor.employeeNumber,
    };
  } else if (params.category === "EMPLOYEE_SHARED") {
    const resolved = await resolveEmployeeTarget({
      orgId: params.orgId,
      actor,
      requestedOwnerId: params.ownerId,
    });
    owner = resolved.target;
    employeeTargets = resolved.targets;
  }

  const search = params.search?.trim();
  const rows = await db.hrDocumentFile.findMany({
    where: {
      orgId: params.orgId,
      category: params.category,
      ...(owner ? { ownerId: owner.id } : { ownerId: null }),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const userIds = Array.from(
    new Set(
      rows
        .flatMap((file) => [file.ownerId, file.uploadedById])
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const users = userIds.length
    ? await db.user.findMany({
        where: { orgId: params.orgId, id: { in: userIds } },
        select: { id: true, name: true, employeeNumber: true },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const storage = await getStorageStatus(params.orgId);
  const canUpload = canUploadHrDocument({
    actor,
    category: params.category,
    ownerId: owner?.id || null,
  });

  return {
    category: params.category,
    files: rows.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
      owner: file.ownerId ? usersById.get(file.ownerId) || null : null,
      uploadedBy: usersById.get(file.uploadedById) || null,
      downloadUrl: `/api/hrms/files/${file.id}/download`,
    })),
    selectedEmployeeId: owner?.id || null,
    employeeTargets,
    permissions: {
      canUpload,
      isHrAdmin: actor.isHrAdmin,
    },
    storage,
  };
}

export async function uploadHrDocument(params: {
  orgId: string;
  actorId: string;
  category: HrDocumentCategory;
  ownerId?: string | null;
  file: File;
}) {
  if (params.file.size <= 0) {
    throw new HrDocumentDriveError(
      "Choose a non-empty file to upload.",
      400,
      "VALIDATION_ERROR",
    );
  }
  if (params.file.size > MAX_FILE_SIZE_BYTES) {
    throw new HrDocumentDriveError(
      "Files must be 25 MB or smaller.",
      413,
      "FILE_TOO_LARGE",
    );
  }

  const actor = await getActor(params.actorId, params.orgId);
  let owner: EmployeeTarget | null = null;
  let accessToken: string;
  let driveFolderId: string;

  if (params.category === "COMPANY_FILES") {
    if (
      !canUploadHrDocument({
        actor,
        category: params.category,
        ownerId: null,
      })
    ) {
      throw new HrDocumentDriveError(
        "Only HR can upload Company Files.",
        403,
        "FORBIDDEN",
      );
    }
    const hierarchy = await ensureDriveHierarchy(params.orgId, params.actorId);
    accessToken = hierarchy.accessToken;
    driveFolderId = hierarchy.config.companyFilesFolderId;
  } else {
    if (params.category === "MY_SPACE") {
      owner = {
        id: actor.id,
        name: actor.name,
        employeeNumber: actor.employeeNumber,
      };
    } else {
      const resolved = await resolveEmployeeTarget({
        orgId: params.orgId,
        actor,
        requestedOwnerId: params.ownerId,
      });
      owner = resolved.target;
      if (
        !canUploadHrDocument({
          actor,
          category: params.category,
          ownerId: owner.id,
        })
      ) {
        throw new HrDocumentDriveError(
          "Reporting managers can view employee files, but only the employee or HR can upload to this folder.",
          403,
          "FORBIDDEN",
        );
      }
    }

    const employeeFolder = await ensureEmployeeFolder({
      orgId: params.orgId,
      actorId: params.actorId,
      category: params.category,
      employee: owner,
    });
    accessToken = employeeFolder.accessToken;
    driveFolderId = employeeFolder.driveFolderId;
  }

  const name = sanitizeFileName(params.file.name);
  const mimeType = params.file.type || "application/octet-stream";
  const uploaded = await uploadFile({
    name,
    mimeType,
    parentFolderId: driveFolderId,
    fileBuffer: Buffer.from(await params.file.arrayBuffer()),
    accessToken,
  });

  try {
    const record = await db.hrDocumentFile.create({
      data: {
        orgId: params.orgId,
        category: params.category,
        ownerId: owner?.id || null,
        driveFileId: uploaded.id,
        driveFolderId,
        name,
        mimeType,
        sizeBytes: params.file.size,
        uploadedById: params.actorId,
      },
    });
    await db.hrmsAuditLog.create({
      data: {
        orgId: params.orgId,
        userId: params.actorId,
        action: "HR_DOCUMENT_UPLOADED",
        details: {
          documentId: record.id,
          category: params.category,
          ownerId: owner?.id || null,
          fileName: name,
          sizeBytes: params.file.size,
        },
      },
    });
    return record;
  } catch (error) {
    await deleteFileOrFolder(uploaded.id, accessToken).catch(() => undefined);
    throw error;
  }
}

export async function downloadHrDocument(params: {
  orgId: string;
  actorId: string;
  documentId: string;
}) {
  const [actor, file] = await Promise.all([
    getActor(params.actorId, params.orgId),
    db.hrDocumentFile.findFirst({
      where: { id: params.documentId, orgId: params.orgId },
    }),
  ]);

  if (!file || !isHrDocumentCategory(file.category)) {
    throw new HrDocumentDriveError(
      "Document not found.",
      404,
      "NOT_FOUND",
    );
  }

  const owner = file.ownerId
    ? await db.user.findFirst({
        where: { id: file.ownerId, orgId: params.orgId },
        select: { managerId: true, tlId: true },
      })
    : null;
  const allowed = canReadHrDocument({
    actor,
    category: file.category,
    ownerId: file.ownerId,
    ownerManagerId: owner?.managerId,
    ownerTlId: owner?.tlId,
  });

  if (!allowed) {
    throw new HrDocumentDriveError(
      "You do not have access to this document.",
      403,
      "FORBIDDEN",
    );
  }

  const accessToken = await getDriveAccessTokenForOrg(
    params.orgId,
    params.actorId,
  );
  const buffer = await downloadFile(file.driveFileId, accessToken);
  await db.hrmsAuditLog
    .create({
      data: {
        orgId: params.orgId,
        userId: params.actorId,
        action: "HR_DOCUMENT_DOWNLOADED",
        details: {
          documentId: file.id,
          category: file.category,
          ownerId: file.ownerId,
          fileName: file.name,
        },
      },
    })
    .catch(() => undefined);

  return {
    buffer,
    name: file.name,
    mimeType: file.mimeType,
  };
}
