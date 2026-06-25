import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden animate-fadeInUp relative" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-base) 0px 8px 24px' }}>
        
        <button onClick={onCancel} className="absolute top-4 right-4" style={{ color: 'var(--text-dim)' }}>
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" 
               style={{ background: isDestructive ? 'rgba(243,114,127,0.15)' : 'rgba(30,215,96,0.15)', color: isDestructive ? 'var(--error)' : 'var(--accent)' }}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-base)' }}>{title}</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-all"
              style={{ 
                background: isDestructive ? 'var(--error)' : 'var(--accent)', 
                color: isDestructive ? '#ffffff' : 'var(--accent-text)',
                boxShadow: 'var(--shadow-base) 0px 4px 8px'
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
