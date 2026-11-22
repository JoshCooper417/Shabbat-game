import { assetUrl, HELPER_DEFS, SHARED_BACKS, ZONE_META } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { getHelpersInSlot } from '../engine/helpers';
import { GameState, LegalMove } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface BoardGridProps {
  state: GameState;
  legalMoves: LegalMove[];
  onClickMoveSlot: (slotIndex: number) => void;
  onClickBoardAction: (actionId: string) => void;
  onClickSubstepSlot: (slotIndex: number) => void;
  onInspectCard: (card: InspectedCard) => void;
}

export function BoardGrid({
  state,
  legalMoves,
  onClickMoveSlot,
  onClickBoardAction,
  onClickSubstepSlot,
  onInspectCard,
}: BoardGridProps) {
  const moveBySlot = new Map(legalMoves.map((m) => [m.targetSlot, m]));
  const sub = state.pendingSubstep;
  const activeSlot = state.helpers[state.activeHelperId].slotIndex;
  const highlightedEventSlots = new Set(state.lastEvent?.highlightedSlots ?? []);

  // Direct on-board quick actions during Step 2 (Tidy, Unblock, Finish Tucked)
  const { legal: legalActions } =
    state.phase === 'ACT' ? getActionEvaluation(state) : { legal: [] };
  const directRoomAction =
    state.phase === 'ACT'
      ? legalActions.find(
          (a) =>
            a.type === 'FINISH_TUCKED_CHORE' ||
            a.type === 'TIDY_BLOCKED' ||
            a.type === 'TIDY_CLUTTERED',
        )
      : undefined;

  return (
    <section className="linen-playmat" aria-label="The 3 by 3 House on the Shabbat Table">
      <div className="playmat-header">
        <div className="playmat-title-group">
          <h2 className="playmat-title">The 3×3 House</h2>
          <span className="playmat-legend">
            Upright = Clear · Tilted = Cluttered · Red = Blocked
          </span>
        </div>
        <span className="playmat-prompt">
          {state.phase === 'MOVE'
            ? `Tap any glowing room to move ${HELPER_DEFS[state.activeHelperId].name}`
            : sub?.kind === 'ICE_COFFEE_PICK'
              ? 'Tap 1 or 2 tilted Cluttered rooms to Clear'
              : sub?.kind === 'TIDY_NEIGHBOR_BONUS'
                ? 'Tap a glowing next-door Cluttered room to Clear it too'
                : state.phase === 'ACT'
                  ? 'Tap a highlighted card on the table or pick an action →'
                  : 'Flip the Event Deck when ready'}
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
          const isActiveRoom =
            room.slotIndex === activeSlot && state.phase !== 'WON' && state.phase !== 'LOST';

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
                      title={`Inspect ${room.card.name} full card`}
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
                      🔍
                    </button>
                  </div>
                </div>

                {/* Room Surface Artwork + Standing 3D Figurines anchored cleanly above the footer */}
                <div className="room-art-wrap">
                  <div className={room.state === 'BLOCKED' ? 'room-blocked-cover' : 'room-art-box'}>
                    <img
                      src={assetUrl(
                        room.state === 'BLOCKED' ? room.card.blockedImage : room.card.artImage,
                      )}
                      alt={
                        room.state === 'BLOCKED'
                          ? `${room.card.name} — Red Blocked`
                          : room.card.name
                      }
                      className="room-art-img"
                    />

                    {move && (
                      <span className={`room-move-banner ${move.kind === 'STAY' ? 'stay' : ''}`}>
                        {move.kind === 'STAY' ? 'Stay Here' : move.label}
                      </span>
                    )}
                    {isTidyBonusTarget && (
                      <span className="room-move-banner substep">+ Clear Bonus</span>
                    )}
                    {isIceCoffeeTarget && (
                      <span className="room-move-banner substep">
                        {isIceCoffeeSelected ? '✓ Selected' : 'Tap to Clear'}
                      </span>
                    )}
                  </div>

                  {occupants.length > 0 && (
                    <div
                      className={`figurines-stage ${occupants.length === 2 ? 'duo' : 'solo'}`}
                      aria-label={`Helpers in ${room.card.name}: ${occupants.map((h) => HELPER_DEFS[h].name).join(', ')}`}
                    >
                      {occupants.map((hid) => {
                        const def = HELPER_DEFS[hid];
                        const hState = state.helpers[hid];
                        const isActive =
                          hid === state.activeHelperId &&
                          state.phase !== 'WON' &&
                          state.phase !== 'LOST';
                        const isMekimi = hid === 'MEKIMI';
                        return (
                          <div
                            key={hid}
                            className={`figurine-piece ${isActive ? 'is-active' : ''} ${
                              hState.resting ? 'is-resting' : ''
                            } ${isMekimi ? 'is-mekimi' : ''}`}
                            style={{ '--helper-color': def.accent } as React.CSSProperties}
                          >
                            <div className="figurine-shadow" />
                            <img
                              src={assetUrl(def.figurineImage)}
                              alt={`${def.name} 3D figurine`}
                              className="figurine-sprite"
                            />
                            <div className="figurine-plate">
                              <span>{def.name}</span>
                              {hState.resting && <em className="figurine-rest-dot">Rest</em>}
                              {hState.carriedErrands.length > 0 && (
                                <span className="figurine-errand-pip">
                                  {hState.carriedErrands.length}E
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="room-footer">
                  <div className="room-name-block">
                    <span className="room-name">{room.card.name}</span>
                    {room.card.subtitle && (
                      <span className="room-subtitle">{room.card.subtitle}</span>
                    )}
                  </div>

                  {isActiveRoom && directRoomAction && (
                    <button
                      type="button"
                      className="room-quick-act-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickBoardAction(directRoomAction.id);
                      }}
                    >
                      {directRoomAction.type === 'FINISH_TUCKED_CHORE'
                        ? '✓ Finish'
                        : directRoomAction.type === 'TIDY_BLOCKED'
                          ? 'Unblock'
                          : '✨ Tidy'}
                    </button>
                  )}
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
