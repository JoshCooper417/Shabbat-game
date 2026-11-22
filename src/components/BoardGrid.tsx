import { assetUrl, HELPER_DEFS, SHARED_BACKS, ZONE_META } from '../data/cards';
import { getHelpersInSlot } from '../engine/helpers';
import { GameState, LegalMove } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface BoardGridProps {
  state: GameState;
  legalMoves: LegalMove[];
  onClickMoveSlot: (slotIndex: number) => void;
  onClickSubstepSlot: (slotIndex: number) => void;
  onInspectCard: (card: InspectedCard) => void;
}

export function BoardGrid({
  state,
  legalMoves,
  onClickMoveSlot,
  onClickSubstepSlot,
  onInspectCard,
}: BoardGridProps) {
  const moveBySlot = new Map(legalMoves.map((m) => [m.targetSlot, m]));
  const sub = state.pendingSubstep;
  const activeSlot = state.helpers[state.activeHelperId].slotIndex;
  const highlightedEventSlots = new Set(state.lastEvent?.highlightedSlots ?? []);

  return (
    <section className="house-panel" aria-label="3 by 3 House Grid">
      <div className="panel-header-row">
        <h2 className="panel-title">The 3×3 House</h2>
        <span className="panel-hint">
          {state.phase === 'MOVE'
            ? 'Click any highlighted room to Move (or click your current room to Stay)'
            : sub?.kind === 'ICE_COFFEE_PICK'
              ? 'Click 1 or 2 Cluttered rooms on the board to Clear'
              : sub?.kind === 'TIDY_NEIGHBOR_BONUS'
                ? 'Click a highlighted next-door Cluttered room to Clear it too!'
                : 'Upright = Clear · Tilted = Cluttered · Red = Blocked · Click “Card” to inspect'}
        </span>
      </div>

      <div className="house-grid">
        {state.rooms.map((room) => {
          const zone = ZONE_META[room.card.zone];
          const occupants = getHelpersInSlot(state, room.slotIndex);
          const move = state.phase === 'MOVE' ? moveBySlot.get(room.slotIndex) : undefined;

          const isTidyBonusTarget =
            state.phase === 'SUBSTEP' &&
            sub?.kind === 'TIDY_NEIGHBOR_BONUS' &&
            sub.eligibleSlots.includes(room.slotIndex);

          const isIceCoffeeTarget =
            state.phase === 'SUBSTEP' &&
            sub?.kind === 'ICE_COFFEE_PICK' &&
            sub.eligibleSlots.includes(room.slotIndex);

          const isIceCoffeeSelected =
            state.phase === 'SUBSTEP' &&
            sub?.kind === 'ICE_COFFEE_PICK' &&
            sub.selectedSlots.includes(room.slotIndex);

          const isClickable = Boolean(move || isTidyBonusTarget || isIceCoffeeTarget);
          const isEventHit = highlightedEventSlots.has(room.slotIndex);
          const isActiveRoom = room.slotIndex === activeSlot && state.phase !== 'WON' && state.phase !== 'LOST';

          const handleTileClick = () => {
            if (move) {
              onClickMoveSlot(room.slotIndex);
            } else if (isTidyBonusTarget || isIceCoffeeTarget) {
              onClickSubstepSlot(room.slotIndex);
            }
          };

          const tileClasses = [
            'room-tile',
            room.state === 'CLUTTERED' ? 'cluttered' : '',
            room.state === 'BLOCKED' ? 'blocked' : '',
            isClickable ? 'clickable' : '',
            isIceCoffeeSelected ? 'selected-substep' : '',
            isEventHit ? 'event-hit' : '',
            !isClickable && isActiveRoom ? 'active-room' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={room.card.id} className="room-slot-wrap">
              <div
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                className={tileClasses}
                onClick={handleTileClick}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleTileClick();
                  }
                }}
              >
                <div className="room-top-bar">
                  <span className="zone-pill" style={{ backgroundColor: zone.color }}>
                    {zone.shortName}
                  </span>
                  <div className="room-top-right">
                    {room.state === 'CLUTTERED' && (
                      <span className="room-status-pill cluttered">Cluttered</span>
                    )}
                    {room.state === 'BLOCKED' && (
                      <span className="room-status-pill blocked">Blocked</span>
                    )}
                    <button
                      type="button"
                      className="room-inspect-btn"
                      title={`Inspect ${room.card.name} card`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectCard({
                          title: room.card.subtitle
                            ? `${room.card.name} (${room.card.subtitle})`
                            : room.card.name,
                          subtitle: `${zone.name} · Currently ${room.state}`,
                          frontImage: room.card.frontImage,
                          backImage: room.card.blockedImage,
                          startOnBack: room.state === 'BLOCKED',
                        });
                      }}
                    >
                      Card
                    </button>
                  </div>
                </div>

                {room.state === 'BLOCKED' ? (
                  <div className="room-blocked-cover">
                    <img
                      src={assetUrl(room.card.blockedImage)}
                      alt={`${room.card.name} — Red Blocked`}
                    />
                    {move && (
                      <span className="room-move-banner">
                        {move.kind === 'STAY' ? 'Stay' : move.label}
                      </span>
                    )}
                    {occupants.length > 0 && (
                      <div className="room-helpers-overlay">
                        {occupants.map((hid) => {
                          const def = HELPER_DEFS[hid];
                          const hState = state.helpers[hid];
                          return (
                            <div
                              key={hid}
                              className={`helper-token ${
                                hid === state.activeHelperId ? 'active-turn' : ''
                              } ${hState.resting ? 'resting' : ''}`}
                              style={{ '--helper-color': def.accent } as React.CSSProperties}
                            >
                              <img
                                src={assetUrl(def.avatarImage)}
                                alt={def.name}
                                className="helper-token-avatar"
                              />
                              <span className="helper-token-name">{def.name}</span>
                              {hState.carriedErrands.length > 0 && (
                                <span className="helper-token-badge">
                                  {hState.carriedErrands.length}E
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="room-art-box">
                    <img
                      src={assetUrl(room.card.artImage)}
                      alt={room.card.name}
                      className="room-art-img"
                    />
                    {move && (
                      <span className="room-move-banner">
                        {move.kind === 'STAY' ? 'Stay' : move.label}
                      </span>
                    )}
                    {isTidyBonusTarget && (
                      <span className="room-move-banner substep">+ Clear Bonus</span>
                    )}
                    {isIceCoffeeTarget && (
                      <span className="room-move-banner substep">
                        {isIceCoffeeSelected ? '✓ Selected' : 'Pick to Clear'}
                      </span>
                    )}
                    {occupants.length > 0 && (
                      <div className="room-helpers-overlay">
                        {occupants.map((hid) => {
                          const def = HELPER_DEFS[hid];
                          const hState = state.helpers[hid];
                          return (
                            <div
                              key={hid}
                              className={`helper-token ${
                                hid === state.activeHelperId ? 'active-turn' : ''
                              } ${hState.resting ? 'resting' : ''}`}
                              style={{ '--helper-color': def.accent } as React.CSSProperties}
                            >
                              <img
                                src={assetUrl(def.avatarImage)}
                                alt={def.name}
                                className="helper-token-avatar"
                              />
                              <span className="helper-token-name">{def.name}</span>
                              {hState.carriedErrands.length > 0 && (
                                <span className="helper-token-badge">
                                  {hState.carriedErrands.length}E
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="room-footer">
                  <div className="room-name-block">
                    <span className="room-name">{room.card.name}</span>
                    {room.card.subtitle && (
                      <span className="room-subtitle">{room.card.subtitle}</span>
                    )}
                  </div>
                </div>

                {room.tuckedChore && (
                  <div
                    className="tucked-chore-strip"
                    title={`Tucked Chore: ${room.tuckedChore.title} — click to inspect`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectCard({
                        title: `Tucked: ${room.tuckedChore!.title}`,
                        subtitle: 'Finish via Room Relay (teammate in row, column, or room)',
                        frontImage: room.tuckedChore!.frontImage,
                        backImage: SHARED_BACKS.chores,
                      });
                    }}
                  >
                    <img
                      src={assetUrl(room.tuckedChore.frontImage)}
                      alt={room.tuckedChore.title}
                      className="tucked-chore-thumb"
                    />
                    <span className="tucked-chore-text">Tucked: {room.tuckedChore.title}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
