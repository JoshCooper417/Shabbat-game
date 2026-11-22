import {
  assetUrl,
  COVER_IMAGE,
  DIFFICULTY_CONFIGS,
  HELPER_DEFS,
  SEAT_ORDER,
  SHARED_BACKS,
} from '../data/cards';
import { DifficultyId, TurnMode } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface StartScreenProps {
  difficulty: DifficultyId;
  turnMode: TurnMode;
  coachEnabled: boolean;
  onSelectDifficulty: (d: DifficultyId) => void;
  onSelectTurnMode: (m: TurnMode) => void;
  onToggleCoach: (enabled: boolean) => void;
  onStartGame: () => void;
  onOpenBooklet: (page?: number) => void;
  onOpenGallery: () => void;
  onInspectCard: (card: InspectedCard) => void;
}

const DIFF_ORDER: DifficultyId[] = ['BEGINNER', 'STANDARD', 'HARD'];

export function StartScreen({
  difficulty,
  turnMode,
  coachEnabled,
  onSelectDifficulty,
  onSelectTurnMode,
  onToggleCoach,
  onStartGame,
  onOpenBooklet,
  onOpenGallery,
  onInspectCard,
}: StartScreenProps) {
  return (
    <main className="start-screen">
      <section className="start-hero">
        <div className="start-cover-frame">
          <div className="start-cover-img-wrap">
            <img
              src={assetUrl(COVER_IMAGE)}
              alt="The Cooper Family preparing for Shabbat"
              className="start-cover-img"
            />
          </div>
          <div className="start-cover-caption">1–4 Players · Ages 6+ · 15–20 Min</div>
        </div>

        <div className="start-config">
          <span className="start-kicker">Cooper Family Edition · Givot Eden</span>
          <h1 className="start-heading">Preparing for Shabbat</h1>
          <p className="start-lead">
            Work together as <strong>Abba, Nael, Mommy, and Mekimi</strong> to finish every Friday
            Chore before <strong>Shabbat Begins!</strong> flips on the Clock. Every card, room,
            and rule matches the official 72-card print pack and 16-page booklet.
          </p>

          <div className="diff-grid" role="radiogroup" aria-label="Choose Difficulty">
            {DIFF_ORDER.map((id) => {
              const cfg = DIFFICULTY_CONFIGS[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === id}
                  className={`diff-card ${difficulty === id ? 'selected' : ''}`}
                  onClick={() => onSelectDifficulty(id)}
                >
                  <span className="diff-name">{cfg.name}</span>
                  <span className="diff-tagline">{cfg.tagline}</span>
                  <span className="diff-meta">
                    {cfg.clockLength} Clock · {cfg.totalChores} Chores ({cfg.startingChoreRow}+
                    {cfg.arrivalChores})
                    <br />
                    {cfg.slowDownCount} Slow-Downs · {cfg.startingClutter} Clutter
                  </span>
                </button>
              );
            })}
          </div>

          <div className="start-options-row">
            <div className="mode-toggle-group" role="group" aria-label="Turn Order">
              <button
                type="button"
                className={`mode-pill ${turnMode === 'FOUR_SEAT' ? 'active' : ''}`}
                onClick={() => onSelectTurnMode('FOUR_SEAT')}
              >
                4-Seat Clockwise (Abba → Nael → Mommy → Mekimi)
              </button>
              <button
                type="button"
                className={`mode-pill ${turnMode === 'TWO_GROUP' ? 'active' : ''}`}
                onClick={() => onSelectTurnMode('TWO_GROUP')}
              >
                1–2P Group Mode (Group A / Group B)
              </button>
            </div>

            <label className="coach-checkbox">
              <input
                type="checkbox"
                checked={coachEnabled}
                onChange={(e) => onToggleCoach(e.target.checked)}
              />
              Live Turn Coach On
            </label>
          </div>

          <div className="start-cta-row">
            <button type="button" className="btn btn-gold" onClick={onStartGame}>
              Start Game ({DIFFICULTY_CONFIGS[difficulty].name})
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onOpenBooklet(1)}>
              Read 16-Page Rulebook
            </button>
            <button type="button" className="btn btn-secondary" onClick={onOpenGallery}>
              Browse All 72 Cards
            </button>
          </div>
        </div>
      </section>

      <section className="start-helpers-section">
        <div className="start-helpers-head">
          <h2 className="section-heading">Meet Your 4 3D Family Figurines &amp; Helper Cards</h2>
          <p className="section-sub">
            Click any Helper card to inspect full-size. Clockwise turn order: Abba → Nael → Mommy →
            Mekimi.
          </p>
        </div>

        <div className="helper-showcase-grid">
          {SEAT_ORDER.map((id) => {
            const h = HELPER_DEFS[id];
            return (
              <div key={id} className="showcase-helper-col">
                <div className="showcase-figurine-stand">
                  <div className="figurine-shadow large" />
                  <img
                    src={assetUrl(h.figurineImage)}
                    alt={`${h.name} 3D tabletop figurine`}
                    className={`showcase-figurine-img ${id === 'MEKIMI' ? 'mekimi' : ''}`}
                  />
                </div>
                <button
                  type="button"
                  className="showcase-card-btn"
                  onClick={() =>
                    onInspectCard({
                      title: `${h.name} — Helper Power Card`,
                      subtitle: `Carry ${h.carryLimit} Errand${h.carryLimit > 1 ? 's' : ''}`,
                      frontImage: h.cardImage,
                      backImage: SHARED_BACKS.helpers,
                    })
                  }
                >
                  <img src={assetUrl(h.cardImage)} alt={`${h.name} Helper Card`} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
