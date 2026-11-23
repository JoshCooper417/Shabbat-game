import { assetUrl, HELPER_DEFS, SEAT_ORDER, SHARED_BACKS, ZONE_META } from '../data/cards';
import { GameState } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface FigureBarProps {
  state: GameState;
  onInspectCard: (card: InspectedCard) => void;
}

export function FigureBar({ state, onInspectCard }: FigureBarProps) {
  return (
    <section
      className="player-seats-tray area-helpers"
      aria-label="4 Family Helper Seats Around the Table"
    >
      <div className="panel-header-row">
        <h2 className="panel-title">Helper Cards Around the Table</h2>
        <span className="panel-hint">
          Clockwise order: Abba → Nael → Mommy → Mekimi · No carry limit on Errands!
        </span>
      </div>

      <div className="helpers-bar-grid">
        {SEAT_ORDER.map((id, idx) => {
          const def = HELPER_DEFS[id];
          const hs = state.helpers[id];
          const room = state.rooms[hs.slotIndex];
          const isActive =
            state.activeHelperId === id && state.phase !== 'WON' && state.phase !== 'LOST';
          const wentThisRound = idx + 1 < state.turnInRound;

          return (
            <div
              key={id}
              className={`helper-seat-card ${isActive ? 'active' : ''}`}
              style={
                {
                  '--helper-color': def.accent,
                  '--helper-soft': def.softBg,
                } as React.CSSProperties
              }
            >
              <div className="helper-seat-top">
                <div className="seat-mini-visuals">
                  <img
                    src={assetUrl(def.figurineImage)}
                    alt={`${def.name} figurine`}
                    className={`seat-mini-figurine ${id === 'MEKIMI' ? 'mekimi' : ''}`}
                  />
                  <button
                    type="button"
                    className="seat-mini-card-btn"
                    title={`Inspect ${def.name}'s Helper Card`}
                    onClick={() =>
                      onInspectCard({
                        title: `${def.name} — Helper Power Card`,
                        subtitle: `2 Actions/Turn · ${def.powers.map((p) => p.name).join(' & ')}`,
                        frontImage: def.cardImage,
                        backImage: SHARED_BACKS.helpers,
                      })
                    }
                  >
                    <img src={assetUrl(def.cardImage)} alt={`${def.name} card`} />
                  </button>
                </div>

                <div className="helper-seat-meta">
                  <div className="helper-seat-name-row">
                    <span className="helper-seat-name">
                      {idx + 1}. {def.name}
                    </span>
                    <span
                      className={`seat-status-tag ${
                        isActive ? 'active' : wentThisRound ? 'resting' : 'ready'
                      }`}
                    >
                      {isActive
                        ? `Acting (${state.actionsRemaining} left)`
                        : wentThisRound
                          ? 'Done This Rd'
                          : 'Up Next'}
                    </span>
                  </div>
                  <div className="helper-seat-loc">
                    In <strong>{room.card.name}</strong> ({ZONE_META[room.card.zone].shortName})
                  </div>
                  <div className="helper-seat-power">
                    {def.powers.map((p) => (
                      <div key={p.name}>
                        <strong>{p.name}</strong>: {p.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {hs.carriedErrands.length > 0 && (
                <div className="helper-errands-row">
                  {hs.carriedErrands.map((errand) => (
                    <button
                      key={errand.id}
                      type="button"
                      className="carried-errand-chip"
                      onClick={() =>
                        onInspectCard({
                          title: `Carried Errand: ${errand.title}`,
                          subtitle: `Deliver to ${ZONE_META[errand.endZone!].shortName}`,
                          frontImage: errand.frontImage,
                          backImage: SHARED_BACKS.chores,
                        })
                      }
                    >
                      <img src={assetUrl(errand.frontImage)} alt={errand.title} />
                      <span>
                        → {ZONE_META[errand.endZone!].shortName}: {errand.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
