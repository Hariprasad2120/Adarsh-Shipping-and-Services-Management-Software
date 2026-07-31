"use client";

import type * as React from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { WorkspaceAction, WorkspaceEmptyTableRow, WorkspaceTable } from "@/components/monolith";

export type ImportRecordTableColumn<T> = {
  key: string;
  label: string;
  render: (record: T) => React.ReactNode;
};

type ImportRecordTableProps<T extends { id: string }> = {
  records: T[];
  columns: ImportRecordTableColumn<T>[];
  disabled?: boolean;
  emptyMessage: string;
  onDelete: (record: T) => void;
  onDuplicate: (record: T) => void;
  onEdit: (record: T) => void;
};

export function ImportRecordTable<T extends { id: string }>({
  columns,
  disabled,
  emptyMessage,
  onDelete,
  onDuplicate,
  onEdit,
  records,
}: ImportRecordTableProps<T>) {
  return (
    <WorkspaceTable>
      <thead>
        <tr>
          <th>Actions</th>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.length === 0 ? (
          <WorkspaceEmptyTableRow colSpan={columns.length + 1}>
            {emptyMessage}
          </WorkspaceEmptyTableRow>
        ) : (
          records.map((record) => (
            <tr key={record.id}>
              <td>
                <div className="flex gap-2">
                  <WorkspaceAction
                    aria-label="Edit record"
                    disabled={disabled}
                    size="compact"
                    variant="outline"
                    onClick={() => onEdit(record)}
                  >
                    <Pencil aria-hidden="true" />
                  </WorkspaceAction>
                  <WorkspaceAction
                    aria-label="Duplicate record"
                    disabled={disabled}
                    size="compact"
                    variant="outline"
                    onClick={() => onDuplicate(record)}
                  >
                    <Copy aria-hidden="true" />
                  </WorkspaceAction>
                  <WorkspaceAction
                    aria-label="Delete record"
                    disabled={disabled}
                    size="compact"
                    variant="destructive"
                    onClick={() => onDelete(record)}
                  >
                    <Trash2 aria-hidden="true" />
                  </WorkspaceAction>
                </div>
              </td>
              {columns.map((column) => (
                <td key={column.key}>{column.render(record)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </WorkspaceTable>
  );
}
