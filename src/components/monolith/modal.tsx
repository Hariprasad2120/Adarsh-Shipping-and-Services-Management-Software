"use client";

import * as React from "react";
import { WorkspaceDialog } from "./workspace-dialog";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  titleClassName,
}: ModalProps) {
  return (
    <WorkspaceDialog
      className={className}
      description={description}
      eyebrow="People operations"
      onClose={onClose}
      open={open}
      title={<span className={titleClassName}>{title}</span>}
    >
      {children}
    </WorkspaceDialog>
  );
}
