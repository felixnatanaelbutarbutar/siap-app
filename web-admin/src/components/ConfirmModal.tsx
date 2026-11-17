import { WorkspaceDialog } from "./WorkspaceDialog";
import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <WorkspaceDialog
      compact
      title={title}
      description={message}
      onClose={onCancel}
      footer={
        <>
          <button className="workspace-button" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`workspace-button ${isDestructive ? "danger" : "primary"}`}
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="workspace-notice flex items-start gap-3">
        <AlertTriangle size={20} className="shrink-0" />
        <p>Pastikan tindakan ini sesuai sebelum melanjutkan.</p>
      </div>
    </WorkspaceDialog>
  );
}
