import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function WorkspaceDialog({
  title,
  description,
  children,
  onClose,
  footer,
  compact = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="workspace-overlay" />
        <Dialog.Content
          className={`workspace-dialog ${compact ? "workspace-dialog-compact" : ""}`}
          aria-describedby={
            description ? "workspace-dialog-description" : undefined
          }
        >
          <header className="workspace-dialog-header">
            <div>
              <p className="workspace-eyebrow">SIAP • Detail & Tindakan</p>
              <Dialog.Title className="workspace-dialog-title">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description
                  id="workspace-dialog-description"
                  className="workspace-description"
                >
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="workspace-icon-button"
              aria-label="Tutup detail"
            >
              <X size={22} />
            </Dialog.Close>
          </header>
          <div className="workspace-dialog-body">{children}</div>
          <footer className="workspace-dialog-footer">
            {footer || (
              <Dialog.Close className="workspace-button">
                Selesai melihat
              </Dialog.Close>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
