import { assetUrl, COVER_IMAGE, DIFFICULTY_CONFIGS } from '../data/cards';
import { GameState } from '../engine/types';

interface EndGameModalProps {
  state: GameState;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function EndGameModal({ state, onPlayAgain, onBackToMenu }: EndGameModalProps) {
  if (state.phase !== 'WON' && state.phase !== 'LOST') return null;

  const won = state.phase === 'WON';
  const cfg = DIFFICULTY_CONFIGS[state.difficulty];
  const img = won ? COVER_IMAGE : 'assets/cards/clock_72_shabbat_begins_QTY1.webp';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={won ? 'Shabbat Shalom! You Won!' : 'Shabbat Begins!'}>
      <div className="modal-card narrow">
        <div className="modal-header">
          <h2 className="modal-title">{won ? 'Shabbat Shalom — You Did It!' : 'Shabbat Begins!'}</h2>
        </div>
        <div className="modal-body">
          <div className="end-game-hero">
            <img
              src={assetUrl(img)}
              alt={won ? 'Cooper Family Shabbat victory' : 'Shabbat Begins! card'}
              className="end-game-art"
            />
            <p className="start-lead">
              {won
                ? `Amazing teamwork! Abba, Nael, Mommy, and Mekimi finished all ${cfg.totalChores} Chores before sunset on ${cfg.name} difficulty!`
                : state.lossReason ??
                  'Candles are lit before all Chores were finished — reshuffle and give Friday afternoon another run!'}
            </p>

            <div className="end-stats-grid">
              <div className="end-stat-box">
                <span className="end-stat-val">
                  {state.doneChores.length}/{cfg.totalChores}
                </span>
                <span className="end-stat-lbl">Chores Done</span>
              </div>
              <div className="end-stat-box">
                <span className="end-stat-val">Round {state.round}</span>
                <span className="end-stat-lbl">{cfg.name}</span>
              </div>
              <div className="end-stat-box">
                <span className="end-stat-val">{state.totalTurns}</span>
                <span className="end-stat-lbl">Total Turns</span>
              </div>
            </div>

            <div className="start-cta-row">
              <button type="button" className="btn btn-gold" onClick={onPlayAgain}>
                Play Again ({cfg.name})
              </button>
              <button type="button" className="btn btn-secondary" onClick={onBackToMenu}>
                Change Mode / Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
