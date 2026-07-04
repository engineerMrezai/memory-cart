import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import GameBoard from './components/GameBoard.jsx'
import BoardSizeModal from './components/BoardSizeModal.jsx'
import WinModal from './components/WinModal.jsx'
import { useGameBoard } from './hooks/useGameBoard.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import './App.css'

function App() {
  const [boardSize, setBoardSize] = useLocalStorage('memory-card.board-size', 0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const game = useGameBoard(boardSize, setBoardSize)

  useEffect(() => {
    if (boardSize && game.cards.length === 0 && !game.isLoading) {
      game.startGame(boardSize)
    }
  }, [boardSize])

  const handleInitialSelect = (size) => {
    setBoardSize(size)
    game.startGame(size)
  }

  const handleSettingsSelect = (size) => {
    game.changeBoardSize(size)
    setIsSettingsOpen(false)
  }

  const isNewBest = game.isWon && game.score >= game.bestScore && game.score > 0

  return (
    <div className="app-shell">
      <Header
        score={game.score}
        bestScore={game.bestScore}
        moves={game.moves}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="app-main">
        {boardSize > 0 && (
          <GameBoard
            cards={game.cards}
            boardSize={boardSize}
            isLoading={game.isLoading}
            onFlip={game.flipCard}
          />
        )}
      </main>

      {boardSize === 0 && (
        <BoardSizeModal mode="initial" currentSize={boardSize} onSelect={handleInitialSelect} />
      )}

      {boardSize > 0 && isSettingsOpen && (
        <BoardSizeModal
          mode="settings"
          currentSize={boardSize}
          onSelect={handleSettingsSelect}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {boardSize > 0 && !isSettingsOpen && game.isWon && (
        <WinModal
          score={game.score}
          bestScore={game.bestScore}
          moves={game.moves}
          isNewBest={isNewBest}
          onPlayAgain={game.restart}
          onChangeSize={() => setIsSettingsOpen(true)}
        />
      )}
    </div>
  )
}

export default App
