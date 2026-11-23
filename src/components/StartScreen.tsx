import {
  assetUrl,
  COVER_IMAGE,
  DIFFICULTY_CONFIGS,
  HELPER_DEFS,
  SEAT_ORDER,
  SHARED_BACKS,
} from '../data/cards';
import { DifficultyId } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface StartScreenProps {
  difficulty: DifficultyId;
  coachEnabled: boolean;
  onSelectDifficulty: (d: DifficultyId) => void;
  onToggleCoach: (enabled: boolean) => void;
  onStartGame: () => void;
  onOpenBooklet: (page?: number) => void;
  onOpenGallery: () => void;
  onInspectCard: (card: InspectedCard) => void;
}

const DIFF_ORDER: DifficultyId[] = ['BEGINNER', 'STANDARD', 'HARD'];

export function StartScreen({
  difficulty,
  coachEnabled,
  onSelectDifficulty,
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
          <span className="start-kicker">Cooper Family Edition</span>
          <h1 className="start-heading">Preparing for Shabbat</h1>
          <p className="start-lead">
            <strong>You may think you are just coming to play a game, but today we are Mommy, Abba, Nael, and Mekimi!</strong>{' '}
            Work together to finish every <strong>Mission</strong> (<strong>Team Chores</strong> &amp;{' '}
            <strong>Errands</strong>) before <strong>Shabbat Begins!</strong> flips on the Clock.
          </p>

          <div className="newcomer-strip" aria-label="How to play in 15 seconds">
            <div className="newcomer-item">
              <span className="newcomer-num">Goal</span>
              <span>Finish all Missions (Team Chores &amp; Errands) before sunset!</span>
            </div>
            <div className="newcomer-item">
              <span className="newcomer-num">Turn</span>
              <span>Take any 2 Actions (Walk, Tidy, Mission, Tool) → Flip 1 Event</span>
            </div>
            <div className="newcomer-item">
              <span className="newcomer-num">Easy</span>
              <span>Only legal moves work &amp; the Coach guides every turn.</span>
            </div>
          </div>

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
                    {cfg.totalChores} Missions (4 face-up + {cfg.choreDeckStart} deck)
                    <br />
                    {cfg.clockLength} Clock · {cfg.startingClutterSlots.length} Clutter
                    {cfg.boxTimeFlies ? ' · No Time Flies' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="start-options-row">
            <span className="panel-hint">
              <strong>Turn Order (1–4 Players):</strong> Always clockwise{' '}
              <strong>Abba → Nael → Mommy → Mekimi</strong> (flip 1 Clock card after Mekimi!).
            </span>

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
            Click any Helper card to inspect full-size. Every Helper gets 2 Actions per turn plus
            their own superpower!
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
                      subtitle: `2 Actions/Turn · ${h.powers.map((p) => p.name).join(' & ')}`,
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
