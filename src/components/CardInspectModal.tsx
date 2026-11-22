import { useEffect, useState } from 'react';
import { assetUrl } from '../data/cards';

export interface InspectedCard {
  title: string;
  subtitle?: string;
  frontImage: string;
  backImage?: string;
  startOnBack?: boolean;
}

interface CardInspectModalProps {
  card: InspectedCard | null;
  onClose: () => void;
}

export function CardInspectModal({ card, onClose }: CardInspectModalProps) {
  const [showingBack, setShowingBack] = useState(false);

  useEffect(() => {
    setShowingBack(Boolean(card?.startOnBack && card?.backImage));
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  if (!card) return null;

  const activeImg = showingBack && card.backImage ? card.backImage : card.frontImage;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={card.title}>
      <div className="modal-card narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{card.title}</h2>
            {card.subtitle && (
              <div style={{ fontSize: '0.78rem', color: '#fcd37d', marginTop: 2 }}>{card.subtitle}</div>
            )}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="inspect-stage">
            <img
              src={assetUrl(activeImg)}
              alt={`${card.title} ${showingBack ? '(Back)' : '(Front)'}`}
              className="inspect-card-img"
            />
            {card.backImage && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowingBack((prev) => !prev)}
              >
                {showingBack ? 'Flip to Front Side' : 'Flip to Back Side'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
