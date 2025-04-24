import React, { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

// Determine if a piece needs extra contrast
function needsExtraContrast(row, col, pieceColor) {
  // If it's a white piece on a white square
  return pieceColor === 'w' && (row + col) % 2 === 0;
}

// Subtle outline for white pieces on dark squares
const whiteChessPieceStyle = {
  WebkitTextStroke: '0.3px black',
  textStroke: '0.3px black'
};

// Slightly stronger outline for white pieces on white squares
const highContrastWhitePieceStyle = {
  WebkitTextStroke: '0.5px black',
  textStroke: '0.5px black'
};

function getSquareColor(row, col) {
  return (row + col) % 2 === 0 ? 'bg-yellow-50' : 'bg-green-700';
}

export default function ChessBoard({ playerColor = 'w', apiKey }) {
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState(null); // [row, col]
  const [highlight, setHighlight] = useState([]); // array of [row,col]
  const [status, setStatus] = useState('');
  const [board, setBoard] = useState(game.board());
  const [turn, setTurn] = useState('w');
  const [promotion, setPromotion] = useState(null); // {from, to, color}
  const aiThinking = useRef(false);

  // This effect runs whenever the game state changes
  useEffect(() => {
    setBoard(game.board());
    setTurn(game.turn());
    updateStatus();
    
    // AI move
    if (game.turn() !== playerColor && !game.isGameOver() && !aiThinking.current) {
      aiThinking.current = true;
      setTimeout(() => aiMove(), 500);
    }
    // eslint-disable-next-line
  }, [game, playerColor]);

  function updateStatus() {
    if (game.isCheckmate()) {
      setStatus('Checkmate! ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins.');
    } else if (game.isStalemate()) {
      setStatus('Stalemate! Draw.');
    } else if (game.isThreefoldRepetition()) {
      setStatus('Draw by threefold repetition.');
    } else if (game.isInsufficientMaterial()) {
      setStatus('Draw by insufficient material.');
    } else if (game.isCheck()) {
      setStatus((game.turn() === 'w' ? 'White' : 'Black') + ' is in check.');
    } else {
      setStatus('');
    }
  }

  function handleSquareClick(row, col) {
    if (game.turn() !== playerColor || game.isGameOver()) return;
    const square = coordsToAlgebraic(row, col);
    if (selected) {
      // Try to make the move
      const moves = game.moves({ square: coordsToAlgebraic(selected[0], selected[1]), verbose: true });
      const move = moves.find(m => m.to === square);
      if (move) {
        if (move.promotion) {
          // Handle promotion UI
          setPromotion({ from: move.from, to: move.to, color: playerColor });
          setSelected(null);
          setHighlight([]);
          return;
        }
        
        // Make the move in the game
        const result = game.move({ from: move.from, to: move.to });
        
        // Create a new game instance with the updated position
        // This is important to trigger the useEffect and update move history
        const newGame = new Chess(game.fen());
        setGame(newGame);
        
        setSelected(null);
        setHighlight([]);
        return;
      } else {
        setSelected(null);
        setHighlight([]);
        setStatus('Invalid move!');
        return;
      }
    }
    // Select own piece
    const piece = board[row][col];
    if (piece && piece.color === playerColor) {
      setSelected([row, col]);
      const moves = game.moves({ square, verbose: true });
      setHighlight(moves.map(m => algebraicToCoords(m.to)));
      setStatus('');
    }
  }

  function handlePromotion(promotionPiece) {
    if (!promotion) return;
    const existingPromotions = board.flat().filter(piece => piece && piece.type === promotionPiece && piece.color === promotion.color);
    const numPromoted = existingPromotions.length;
    const baseCount = { q: 1, r: 2, b: 2, n: 2 }; // Max original pieces per type
    const maxAllowed = baseCount[promotionPiece];
    if (numPromoted >= maxAllowed) {
      setStatus('You already have the maximum number of ' + (promotionPiece === 'q' ? 'queens' : promotionPiece === 'r' ? 'rooks' : promotionPiece === 'b' ? 'bishops' : 'knights') + ' on the board! Choose another piece.');
      return;
    }
    
    // Make the promotion move
    const result = game.move({ from: promotion.from, to: promotion.to, promotion: promotionPiece });
    
    // Create a new game instance to ensure state updates
    const newGame = new Chess(game.fen());
    setGame(newGame);
    
    setPromotion(null);
  }

  function fallbackRandomMove() {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;
    const move = moves[Math.floor(Math.random() * moves.length)];
    
    // Make the move and create a new game instance
    game.move(move);
    const newGame = new Chess(game.fen());
    setGame(newGame);
  }

  // AI move using Gemini or random fallback
  async function aiMove() {
    if (game.isGameOver()) return;
    const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const envModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash-latest';
    const apiKeyToUse = apiKey || envApiKey;
    const modelToUse = envModel;
    if (apiKeyToUse) {
      setStatus('Gemini AI thinking...');
      try {
        const fen = game.fen();
        const move = await getGeminiAIMove(fen, game.turn(), apiKeyToUse, modelToUse);
        if (move && move.from && move.to) {
          // Make AI move and create a new game instance
          game.move({ from: move.from, to: move.to });
          const newGame = new Chess(game.fen());
          setGame(newGame);
        } else {
          setStatus('Gemini AI failed, using random move.');
          fallbackRandomMove();
        }
      } catch (e) {
        setStatus('Gemini AI error, using random move.');
        fallbackRandomMove();
      }
      aiThinking.current = false;
      return;
    }
    fallbackRandomMove();
    aiThinking.current = false;
  }

  // Gemini API integration (supports model selection)
  async function getGeminiAIMove(fen, color, apiKey, model) {
    const prompt = `Given this FEN: ${fen}, what is the best move for ${color === 'w' ? 'white' : 'black'}? Respond as a JSON object: {from: '<from>', to: '<to>', promotion: '<promotion>' (if any)}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });
    const data = await response.json();
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const text = data.candidates[0].content.parts[0].text;
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Helpers
  function coordsToAlgebraic(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }
  function algebraicToCoords(str) {
    const col = str.charCodeAt(0) - 97;
    const row = 8 - parseInt(str[1]);
    return [row, col];
  }

  function renderPromotionUI() {
    if (!promotion) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 sm:p-12 rounded-xl shadow-2xl border border-gray-700">
          <div className="text-2xl sm:text-4xl font-bold text-white mb-6 sm:mb-10 text-center">Choose a piece</div>
          <div className="flex justify-center space-x-4 sm:space-x-10">
            {['q', 'r', 'b', 'n'].map(p => (
              <button 
                key={p} 
                onClick={() => handlePromotion(p)} 
                className="w-16 h-16 sm:w-28 sm:h-28 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center"
              >
                <span 
                  className={`text-4xl sm:text-7xl ${promotion.color === 'w' ? 'text-white' : 'text-black'}`}
                  style={promotion.color === 'w' ? highContrastWhitePieceStyle : {}}
                >
                  {pieceTypeToUnicode({ type: p, color: promotion.color })}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderBoard() {
    return (
      <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4 sm:p-10">
        <div className="bg-gray-800 rounded-xl p-4 sm:p-10 shadow-2xl border border-gray-700 flex flex-col items-center">
          <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              ← Back to Menu
            </button>
            <div className="text-white text-lg sm:text-xl mt-2 sm:mt-0">Playing as <span className="font-bold">{playerColor === 'w' ? 'White' : 'Black'}</span></div>
          </div>
          
          <div className="text-blue-500 mb-4 text-lg">{status}</div>
          
          <div className="board-container">
            <div className="flex flex-col">
              {/* Column labels - Hide on small screens */}
              <div className="hidden sm:flex flex-row">
                <div className="w-8 sm:w-14 h-8 sm:h-14" />
                {[...Array(8)].map((_, i) => (
                  <div className="w-10 h-8 sm:w-[80px] sm:h-14 flex items-center justify-center text-green-700 text-sm sm:text-xl font-medium" key={i}>
                    {String.fromCharCode(97 + i)}
                  </div>
                ))}
              </div>
              
              {/* Rows */}
              {board.map((row, rowIdx) => (
                <div className="flex flex-row" key={rowIdx}>
                  <div className="w-8 sm:w-14 h-10 sm:h-[80px] flex items-center justify-center text-green-700 text-sm sm:text-xl font-medium">
                    {8 - rowIdx}
                  </div>
                  <div className="flex flex-row">
                    {row.map((piece, colIdx) => {
                      const isHighlighted = highlight.some(([r, c]) => r === rowIdx && c === colIdx);
                      const isSelected = selected && selected[0] === rowIdx && selected[1] === colIdx;
                      return (
                        <div
                          key={colIdx}
                          className={`w-10 h-10 sm:w-[80px] sm:h-[80px] flex items-center justify-center cursor-pointer ${getSquareColor(rowIdx, colIdx)} 
                            ${isHighlighted ? 'ring-4 ring-blue-400 ring-inset' : ''} 
                            ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''}`}
                          onClick={() => handleSquareClick(rowIdx, colIdx)}
                        >
                          {piece && (
                            <span
                              className={`text-2xl sm:text-6xl ${piece.color === 'w' ? 'text-white' : 'text-black'}`}
                              style={needsExtraContrast(rowIdx, colIdx, piece.color) ? highContrastWhitePieceStyle : piece.color === 'w' ? whiteChessPieceStyle : {}}
                            >
                              {pieceTypeToUnicode(piece)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full text-center py-3 sm:py-5 bg-gray-100 text-gray-900 font-bold text-lg sm:text-2xl mt-4 rounded-md">
            {turn === 'w' ? "White's Turn" : "Black's Turn"}
          </div>
        </div>
        
        {/* Promotion UI */}
        {renderPromotionUI()}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-10 p-10 bg-gray-900 min-h-screen items-center justify-center">
      {renderBoard()}
    </div>
  );
}

function pieceTypeToUnicode(piece) {
  if (!piece) return '';
  const map = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  const type = piece.type ? piece.type[0] : piece.type;
  return map[piece.color][type] || '';
}
