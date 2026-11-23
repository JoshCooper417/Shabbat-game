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
  const safeFlipsLeft = Math.max(0, unflippedCount - 1);
  const shieldCount = state.clockShields.length;

  return (
    <section className="clock-strip" aria-label="Shabbat Clock">
      <div className="clock-strip-head">
        <span className="clock-strip-title">Shabbat Clock</span>
        <span className={`clock-strip-sub ${safeFlipsLeft === 0 ? 'urgent' : ''}`}>
          {safeFlipsLeft === 0
            ? shieldCount > 0
              ? `FINAL ROUND (+${shieldCount} shielded by Cousin Aviel!)`
              : 'FINAL ROUND — Next flip is Shabbat Begins!'
            : `${safeFlipsLeft} round${safeFlipsLeft === 1 ? '' : 's'} left before Shabbat Begins!${
                shieldCount > 0 ? ` (+${shieldCount} shielded)` : ''
              }`}
        </span>
      </div>

      <div className="clock-cards-row">
        {state.clockRow.map((card, idx) => {
          const isNext = idx === nextUnflippedIdx;
          const isShielded =
            !card.flipped &&
            nextUnflippedIdx >= 0 &&
            idx >= nextUnflippedIdx &&
            idx < nextUnflippedIdx + shieldCount;
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
                    ? 'Shielded by Cousin Aviel Drops By!'
                    : idx === state.clockRow.length - 1
                      ? 'Rightmost Clock card: Shabbat Begins! (face-down)'
                      : `Clock card #${idx + 1} (face-down)`
              }
              onClick={() =>
                onInspectCard({
                  title: card.flipped ? card.title : `Shabbat Clock Card #${idx + 1}`,
                  subtitle: card.flipped
                    ? 'Already flipped'
                    : isShielded
                      ? 'Guarded by Cousin Aviel Drops By! (absorbs 1 Clock flip)'
                      : idx === state.clockRow.length - 1
                        ? 'Shabbat Begins! sits face-down at the far right'
                        : "Flips after Mekimi's turn (or Time Flies)",
                  frontImage: card.flipped ? card.frontImage : SHARED_BACKS.clock,
                })
              }
            >
              <img
                src={assetUrl(img)}
                alt={card.flipped ? card.title : 'Face-down Shabbat Clock card'}
              />
            </button>
          );
        })}
      </div>

      {shieldCount > 0 && (
        <button
          type="button"
          className="clock-shield-badge"
          onClick={() =>
            onInspectCard({
              title: state.clockShields[0].title,
              subtitle: `${shieldCount} active shield${shieldCount > 1 ? 's' : ''} guarding upcoming Clock flips (boxed once triggered)`,
              frontImage: state.clockShields[0].frontImage,
              backImage: SHARED_BACKS.eventsAndTools,
            })
          }
        >
          <img
            src={assetUrl(state.clockShields[0].frontImage)}
            alt="Cousin Aviel Drops By! shield"
            className="clock-shield-thumb"
          />
          Shield Active: Cousin Aviel Drops By!{shieldCount > 1 ? ` ×${shieldCount}` : ''}
        </button>
      )}
    </section>
  );
}
