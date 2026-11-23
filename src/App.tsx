import { useEffect, useMemo, useState } from 'react';
import { ActionPanel } from './components/ActionPanel';
import { BoardGrid } from './components/BoardGrid';
import { BookletModal } from './components/BookletModal';
import { CardGalleryModal } from './components/CardGalleryModal';
import { CardInspectModal, InspectedCard } from './components/CardInspectModal';
import { ClockStrip } from './components/ClockStrip';
import { EndGameModal } from './components/EndGameModal';
import { FigureBar } from './components/FigureBar';
import { HistoryLogModal } from './components/HistoryLogModal';
import { StartScreen } from './components/StartScreen';
import { TableCardsPanel } from './components/TableCardsPanel';
import { assetUrl, DIFFICULTY_CONFIGS, TABLE_WOOD_IMAGE } from './data/cards';
import { getLegalMoves } from './engine/movement';
import {
  applyAction,
  applyAdvanceTurn,
  applyEndTurnActions,
  applyEventFlip,
  applyMove,
  applySubstepChoice,
} from './engine/reducer';
import { createInitialGameState } from './engine/setup';
import { DifficultyId, GameState } from './engine/types';

export default function App() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('BEGINNER');
  const [coachEnabled, setCoachEnabled] = useState(true);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [undoStack, setUndoStack] = useState<GameState[]>([]);

  const [bookletOpen, setBookletOpen] = useState(false);
  const [bookletPage, setBookletPage] = useState(1);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);

  const screenKey = gameState ? `game-${gameState.seed}` : 'menu';
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    const raf = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(raf);
  }, [screenKey]);

  const legalMoves = useMemo(() => {
    if (!gameState || gameState.phase !== 'TURN' || gameState.actionsRemaining <= 0) return [];
    return getLegalMoves(gameState);
  }, [gameState]);

  const startNewGame = (diff = selectedDifficulty) => {
    const fresh = createInitialGameState({ difficulty: diff });
    setGameState(fresh);
    setUndoStack([]);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const transition = (next: GameState) => {
    if (!gameState || next === gameState) return;
    setUndoStack((prev) => [...prev, gameState]);
    setGameState(next);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setGameState(prev);
  };

  const handleMove = (targetSlot: number) => {
    if (!gameState) return;
    transition(applyMove(gameState, targetSlot));
  };

  const handleAction = (actionId: string) => {
    if (!gameState) return;
    transition(applyAction(gameState, actionId));
  };

  const handleEndActions = () => {
    if (!gameState) return;
    transition(applyEndTurnActions(gameState));
  };

  const handleSubstepChoice = (payload: Parameters<typeof applySubstepChoice>[1]) => {
    if (!gameState) return;
    if (payload.type === 'CANCEL_SUBSTEP') {
      const canceled = applySubstepChoice(gameState, payload);
      if (canceled !== gameState) {
        setUndoStack((stack) =>
          stack.length > 0 && stack[stack.length - 1].phase === 'TURN' ? stack.slice(0, -1) : stack,
        );
        setGameState(canceled);
      }
      return;
    }
    if (payload.type === 'TOGGLE_ICE_COFFEE_SLOT') {
      setGameState(applySubstepChoice(gameState, payload));
      return;
    }
    transition(applySubstepChoice(gameState, payload));
  };

  const handleBoardSubstepClick = (slotIndex: number) => {
    if (!gameState || gameState.phase !== 'SUBSTEP' || !gameState.pendingSubstep) return;
    if (gameState.pendingSubstep.kind === 'ICE_COFFEE_PICK') {
      handleSubstepChoice({ type: 'TOGGLE_ICE_COFFEE_SLOT', slotIndex });
    }
  };

  const handleFlipEvent = () => {
    if (!gameState) return;
    transition(applyEventFlip(gameState));
  };

  const handleAdvanceTurn = () => {
    if (!gameState) return;
    transition(applyAdvanceTurn(gameState));
  };

  const openBooklet = (page = 1) => {
    setBookletPage(page);
    setBookletOpen(true);
  };

  const cfg = gameState ? DIFFICULTY_CONFIGS[gameState.difficulty] : null;

  return (
    <div
      className="app-shell tabletop-surface"
      style={
        {
          '--table-wood-url': `url(${assetUrl(TABLE_WOOD_IMAGE)})`,
        } as React.CSSProperties
      }
    >
      <header className="topbar">
        <div className="topbar-brand">
          <button
            type="button"
            className="topbar-title-btn"
            onClick={() => {
              setGameState(null);
              setUndoStack([]);
            }}
          >
            <span className="topbar-title">Preparing for Shabbat</span>
            <span className="topbar-sub">Cooper Family Edition</span>
          </button>

          {gameState && cfg && (
            <div className="topbar-stats">
              <span className="stat-chip">{cfg.name}</span>
              <span className="stat-chip">
                Round {gameState.round} · Turn {gameState.turnInRound}/4
              </span>
              <span className="stat-chip gold">
                Chores {gameState.doneChores.length}/{cfg.totalChores}
              </span>
            </div>
          )}
        </div>

        <nav className="topbar-actions" aria-label="Game controls">
          {gameState && (
            <>
              <button
                type="button"
                className="nav-btn"
                disabled={undoStack.length === 0}
                onClick={handleUndo}
              >
                ↶ Undo ({undoStack.length})
              </button>
              <button
                type="button"
                className={`nav-btn ${coachEnabled ? 'active' : ''}`}
                onClick={() => setCoachEnabled((v) => !v)}
              >
                Coach: {coachEnabled ? 'On' : 'Off'}
              </button>
              <button type="button" className="nav-btn" onClick={() => setLogOpen(true)}>
                Log
              </button>
            </>
          )}
          <button type="button" className="nav-btn" onClick={() => openBooklet(15)}>
            How to Play
          </button>
          <button type="button" className="nav-btn" onClick={() => openBooklet(1)}>
            Rulebook (16p)
          </button>
          <button type="button" className="nav-btn" onClick={() => setGalleryOpen(true)}>
            72 Cards
          </button>
          {gameState && (
            <button
              type="button"
              className="nav-btn"
              onClick={() => {
                setGameState(null);
                setUndoStack([]);
              }}
            >
              Menu
            </button>
          )}
        </nav>
      </header>

      {!gameState ? (
        <StartScreen
          difficulty={selectedDifficulty}
          coachEnabled={coachEnabled}
          onSelectDifficulty={setSelectedDifficulty}
          onToggleCoach={setCoachEnabled}
          onStartGame={() => startNewGame(selectedDifficulty)}
          onOpenBooklet={openBooklet}
          onOpenGallery={() => setGalleryOpen(true)}
          onInspectCard={setInspectedCard}
        />
      ) : (
        <main className="game-container">
          <ClockStrip state={gameState} onInspectCard={setInspectedCard} />

          <div className="game-main-grid">
            <div className="board-column">
              <BoardGrid
                state={gameState}
                legalMoves={legalMoves}
                onClickMoveSlot={handleMove}
                onClickBoardAction={handleAction}
                onClickSubstepSlot={handleBoardSubstepClick}
                onInspectCard={setInspectedCard}
              />
              <FigureBar state={gameState} onInspectCard={setInspectedCard} />
            </div>
            <div className="control-column">
              <ActionPanel
                state={gameState}
                legalMoves={legalMoves}
                coachEnabled={coachEnabled}
                onMove={handleMove}
                onAction={handleAction}
                onEndActions={handleEndActions}
                onSubstepChoice={handleSubstepChoice}
                onFlipEvent={handleFlipEvent}
                onAdvanceTurn={handleAdvanceTurn}
                onInspectCard={setInspectedCard}
              />
              <TableCardsPanel
                state={gameState}
                onPlayAction={handleAction}
                onInspectCard={setInspectedCard}
              />
            </div>
          </div>
        </main>
      )}

      <BookletModal open={bookletOpen} initialPage={bookletPage} onClose={() => setBookletOpen(false)} />
      <CardGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onInspect={setInspectedCard}
      />
      <CardInspectModal card={inspectedCard} onClose={() => setInspectedCard(null)} />
      {gameState && (
        <>
          <HistoryLogModal open={logOpen} log={gameState.log} onClose={() => setLogOpen(false)} />
          <EndGameModal
            state={gameState}
            onPlayAgain={() => startNewGame(gameState.difficulty)}
            onBackToMenu={() => {
              setGameState(null);
              setUndoStack([]);
            }}
          />
        </>
      )}
    </div>
  );
}
