import { useEffect, useState } from 'react';
import { assetUrl, GALLERY_ITEMS, GalleryItem } from '../data/cards';
import { InspectedCard } from './CardInspectModal';

interface CardGalleryModalProps {
  open: boolean;
  onClose: () => void;
  onInspect: (card: InspectedCard) => void;
}

const CATEGORIES: ('All' | GalleryItem['category'])[] = [
  'All',
  'Helpers',
  'Rooms',
  'Chores',
  'Tools',
  'Slow-Downs',
  'Clock',
  'Card Backs',
];

export function CardGalleryModal({ open, onClose, onInspect }: CardGalleryModalProps) {
  const [category, setCategory] = useState<'All' | GalleryItem['category']>('All');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered =
    category === 'All'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === category);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="72-Card Deck Gallery">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Complete 72-Card Deck Gallery</h2>
            <div style={{ fontSize: '0.78rem', color: '#fcd37d', marginTop: 2 }}>
              Click any card to inspect full-size (and flip double-sided Rooms &amp; backs!)
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <div className="gallery-filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`mode-pill ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="gallery-grid">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="gallery-tile"
                onClick={() =>
                  onInspect({
                    title: item.qty > 1 && item.category !== 'Card Backs' ? `${item.title} (×${item.qty})` : item.title,
                    subtitle: item.subtitle,
                    frontImage: item.frontImage,
                    backImage: item.backImage,
                  })
                }
              >
                <img src={assetUrl(item.frontImage)} alt={item.title} loading="lazy" />
                <div className="gallery-tile-title">
                  {item.title}
                  {item.qty > 1 && item.category !== 'Card Backs' ? ` ×${item.qty}` : ''}
                </div>
                <div className="gallery-tile-sub">{item.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
