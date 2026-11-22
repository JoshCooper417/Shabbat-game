import { assetUrl, SHARED_BACKS } from '../data/cards';
import { GameState } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface ClockStripProps {
  state: GameState;
  onInspectCard: (card: InspectedCard) => void;
}

export function ClockStrip({ state, onInspectCard }: ClockStripProps) {
  const nextUnflippedIdx = state.clockRow.findIndex((c) => !c.flipped);
  const unflippedCount = state.clockRow.filter((c) => !c.flipped).length;

  return (
    <section className="clock-strip" aria-label="Shabbat Clock">
      <div className="clock-strip-head">
        <span className="clock-strip-title">Shabbat Clock</span>
        <span className="clock-strip-sub">
          {unflippedCount} card{unflippedCount === 1 ? '' : 's'} left before Shabbat
          {state.clockShield ? ' (+1 shielded!)' : ''}
        </span>
      </div>

      <div className="clock-cards-row">
        {state.clockRow.map((card, idx) => {
          const isNext = idx === nextUnflippedIdx;
          const isShielded = isNext && state.clockShield !== null;
          const img = card.flipped ? card.frontImage : SHARED_BACKS.clock;

          return (
            <button
              key={card.id}
              type="button"
              className={`clock-slot ${card.flipped ? 'flipped' : ''} ${
                isNext ? 'next-up' : ''
              } ${isShielded ? 'shielded' : ''}`}
              title={
                card.flipped
                  ? `${card.title} (Flipped)`
                  : isShielded
                    ? 'Next Clock card — shielded by Early Prep Paid Off!'
                    : idx === state.clockRow.length - 1
                      ? 'Rightmost Clock card: Shabbat Begins! (face-down)'
                      : `Clock card #${idx + 1} (face-down)`
              }
              onClick={() =>
                onInspectCard({
                  title: card.flipped ? card.title : `Shabbat Clock Card #${idx + 1}`,
                  subtitle: card.flipped
                    ? 'Already flipped'
                    : idx === state.clockRow.length - 1
                      ? 'Shabbat Begins! sits face-down at the far right'
                      : 'Face-down until flipped at Round End (or Time Flies)',
                  frontImage: card.flipped ? card.frontImage : SHARED_BACKS.clock,
                })
              }
            >
              <img src={assetUrl(img)} alt={card.flipped ? card.title : 'Face-down Shabbat Clock card'} />
            </button>
          );
        })}
      </div>

      {state.clockShield && (
        <button
          type="button"
          className="clock-shield-badge"
          onClick={() =>
            onInspectCard({
              title: state.clockShield!.title,
              subtitle: 'Shielding the next Clock flip (will return to box once triggered)',
              frontImage: state.clockShield!.frontImage,
              backImage: SHARED_BACKS.eventsAndTools,
            })
          }
        >
          <img
            src={assetUrl(state.clockShield.frontImage)}
            alt="Early Prep Paid Off! shield"
            className="clock-shield-thumb"
          />
          Shield Active: Early Prep Paid Off!
        </button>
      )}
    </section>
  );
}
