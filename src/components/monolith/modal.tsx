"use client";

import * as React from "react";
import {
  WorkspaceDialog,
  type WorkspaceDialogSize,
} from "./workspace-dialog";

export type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
  size?: WorkspaceDialogSize;
  titleClassName?: string;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  eyebrow = "Workspace action",
  size,
  titleClassName,
}: ModalProps) {
  return (
    <WorkspaceDialog
      className={className}
      description={description}
      eyebrow={eyebrow}
      onClose={onClose}
      open={open}
      size={size}
      title={<span className={titleClassName}>{title}</span>}
    >
      {children}
    </WorkspaceDialog>
  );
}
