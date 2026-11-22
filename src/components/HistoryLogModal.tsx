import { useEffect } from 'react';
import { LogEntry } from '../engine/types';

interface HistoryLogModalProps {
  open: boolean;
  log: LogEntry[];
  onClose: () => void;
}

export function HistoryLogModal({ open, log, onClose }: HistoryLogModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Turn and Event Log">
      <div className="modal-card narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Turn &amp; Event Log ({log.length})</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="log-list">
            {[...log].reverse().map((entry) => (
              <div key={entry.id} className="log-row">
                <span className="log-meta">R{entry.round}·T{entry.turn}</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
