import { useEffect, useState } from 'react';
import { assetUrl, BOOKLET_PAGES } from '../data/cards';

interface BookletModalProps {
  open: boolean;
  initialPage?: number;
  onClose: () => void;
}

export function BookletModal({ open, initialPage = 1, onClose }: BookletModalProps) {
  const [pageIdx, setPageIdx] = useState(
    Math.max(0, Math.min(BOOKLET_PAGES.length - 1, initialPage - 1)),
  );

  useEffect(() => {
    if (open) {
      setPageIdx(Math.max(0, Math.min(BOOKLET_PAGES.length - 1, initialPage - 1)));
    }
  }, [open, initialPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPageIdx((p) => Math.min(BOOKLET_PAGES.length - 1, p + 1));
      if (e.key === 'ArrowLeft') setPageIdx((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const current = BOOKLET_PAGES[pageIdx];

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Official Family Rulebook"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Official 16-Page Family Rulebook</h2>
            <div style={{ fontSize: '0.78rem', color: '#fcd37d', marginTop: 2 }}>
              Page {current.page} of {BOOKLET_PAGES.length} — {current.title}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          {/* Mobile page jump dropdown so the full page + Next button stay above the fold */}
          <label className="booklet-mobile-select-wrap">
            <span>Jump to page:</span>
            <select
              className="booklet-mobile-select"
              value={pageIdx}
              onChange={(e) => setPageIdx(Number(e.target.value))}
            >
              {BOOKLET_PAGES.map((p, idx) => (
                <option key={p.page} value={idx}>
                  p.{p.page} — {p.title}
                </option>
              ))}
            </select>
          </label>

          <div className="booklet-layout">
            <nav className="booklet-toc" aria-label="Rulebook pages">
              {BOOKLET_PAGES.map((p, idx) => (
                <button
                  key={p.page}
                  type="button"
                  className={`booklet-toc-btn ${idx === pageIdx ? 'active' : ''}`}
                  onClick={() => setPageIdx(idx)}
                >
                  p.{p.page} — {p.title}
                </button>
              ))}
            </nav>

            <div className="booklet-stage">
              <img
                src={assetUrl(current.image)}
                alt={`Rulebook Page ${current.page}: ${current.title}`}
                className="booklet-page-img"
              />
              <div className="booklet-nav-bar">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={pageIdx === 0}
                  onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPageIdx(14)}
                >
                  Kid’s Guide (p.15)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPageIdx(15)}
                >
                  Quick Ref (p.16)
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={pageIdx === BOOKLET_PAGES.length - 1}
                  onClick={() => setPageIdx((p) => Math.min(BOOKLET_PAGES.length - 1, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
