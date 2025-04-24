import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Chess } from 'chess.js';
import ChessBoard from '../components/ChessBoard';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import Piece from '../components/Piece';

// Using the deployed server URL from Render
const SERVER_URL = 'https://chessverse-backend.onrender.com';

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

function pieceTypeToUnicode(piece) {
  if (!piece) return '';
  const map = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  const type = piece.type ? piece.type[0] : piece.type;
  return map[piece.color][type] || '';
}

export default function Multiplayer({ onGoBack }) {
  const socketRef = useRef(null);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [fen, setFen] = useState(new Chess().fen());
  const [turn, setTurn] = useState('w');
  const [status, setStatus] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [playerNum, setPlayerNum] = useState(null);
  const [color, setColor] = useState('w');
  const [board, setBoard] = useState(new Chess().board());
  const [highlight, setHighlight] = useState([]);
  const [selected, setSelected] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [promotion, setPromotion] = useState(null);
  const chessRef = useRef(new Chess());
  const [inGame, setInGame] = useState(false);
  const [gameStatus, setGameStatus] = useState({ status: 'waiting' });
  const [playerColor, setPlayerColor] = useState(null);
  const [numPlayers, setNumPlayers] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionMove, setPromotionMove] = useState(null);
  const [position, setPosition] = useState(null);
  const chess = useRef(new Chess());
  const timeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Only create the socket once
  useEffect(() => {
    // Cleanup any existing socket connection first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Create socket with minimal config first
    const socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    // Store reference immediately
    socketRef.current = socket;
    
    // Connection event handlers
    socket.on('connect', () => {
      setStatus('Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setStatus(`Connection error. Please check if the server is running.`);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      setStatus(`Reconnecting...`);
    });

    socket.on('reconnect_failed', () => {
      setStatus(`Failed to connect to server. Please try again.`);
    });

    // Handle welcome message from server
    socket.on('welcome', (data) => {
      setStatus('Connected to server');
    });

    // Handle room creation event (backup in case callback fails)
    socket.on('roomCreated', (data) => {
      if (data.error) {
        setStatus(`Error: ${data.error}`);
        return;
      }
      
      handleRoomCreated(data);
    });

    socket.on('error', (data) => {
      setStatus(`Server error: ${data.message}`);
      setWaiting(false);
    });

    socket.on('move', ({ move, fen, turn, status }) => {
      chess.current.load(fen);
      setPosition(chess.current.fen());
      setGameStatus({ status, turn });
      
      setFen(fen);
      setTurn(turn);
      setStatus(status);
      
      // Update board and chess reference
      const chessObj = new Chess(fen);
      setBoard(chessObj.board());
      chessRef.current = chessObj;
      
      setSelected(null);
      setHighlight([]);
      if (status === 'checkmate' || status === 'draw' || status === 'stalemate') setGameOver(true);
    });

    socket.on('playerJoined', ({ players }) => {
      setPlayerNum(players);
      setStatus(players === 2 ? 'Game started!' : 'Waiting for opponent to join...');
    });

    socket.on('playerLeft', () => {
      setStatus('Opponent left the game.');
      setGameOver(true);
    });

    return () => {
      socket.off('move');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('reconnect_attempt');
      socket.off('reconnect_failed');
      socket.off('welcome');
      socket.off('roomCreated');
      socket.off('error');
    };
  }, []);

  // Cleanup function for socket connection
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function createRoom() {
    if (!socketRef.current) {
      setStatus("Error: Socket not connected. Please refresh the page.");
      return;
    }
    
    if (!socketRef.current.connected) {
      setStatus("Not connected to server. Please try again.");
      return;
    }
    
    setWaiting(true);
    setStatus("Creating room...");
    
    const socket = socketRef.current;
    socket.emit('createRoom', (data) => {
      setWaiting(false);
      
      if (!data) {
        setStatus("Error: No response from server");
        return;
      }
      
      if (data.error) {
        setStatus(`Error: ${data.error}`);
        return;
      }
      
      handleRoomCreated(data);
    });
  }
  
  // New function to handle room creation from either callback or event
  function handleRoomCreated(data) {
    setRoomId(data.roomId);
    setJoined(true);
    setColor('w');
    setPlayerNum(1);
    setStatus('Waiting for opponent to join...');
    
    // Reset the chess instance
    chess.current.reset();
    setPosition(chess.current.fen());
    setGameStatus({ status: 'waiting', turn: 'w' });
    setWaiting(false);
  }

  function joinRoom() {
    if (!socketRef.current) {
      setStatus("Error: Socket not connected. Please refresh the page.");
      return;
    }
    
    if (!socketRef.current.connected) {
      setStatus("Not connected to server. Please try again.");
      return;
    }
    
    if (!inputRoom) {
      setStatus("Please enter a room ID");
      return;
    }
    
    setWaiting(true);
    const socket = socketRef.current;
    socket.emit('joinRoom', { roomId: inputRoom }, (data) => {
      setWaiting(false);
      if (data.success) {
        setRoomId(inputRoom);
        setJoined(true);
        setColor('b');
        
        // Initialize the chess instance with the provided FEN
        const chess = new Chess(data.fen);
        setFen(data.fen);
        setBoard(chess.board());
        chessRef.current = chess;
        
        setPlayerNum(2);
        setStatus('Game started!');
        setGameOver(false);
        
        socket.emit('getState', { roomId: inputRoom }, (state) => {
          if (!state.error) {
            setGameStatus({ status: state.status, turn: state.turn });
          }
        });
      } else {
        setStatus(data.error || 'Failed to join room.');
      }
    });
  }

  function handleSquareClick(row, col) {
    if (!joined || gameOver) return;
    if ((color === 'w' && turn !== 'w') || (color === 'b' && turn !== 'b')) return;
    const square = coordsToAlgebraic(row, col);
    if (selected) {
      const moves = chessRef.current.moves({ square: coordsToAlgebraic(selected[0], selected[1]), verbose: true });
      const move = moves.find(m => m.to === square);
      if (move) {
        if (move.promotion) {
          setPromotion({ from: move.from, to: move.to, color });
          setSelected(null);
          setHighlight([]);
          return;
        }
        sendMove({ from: move.from, to: move.to });
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
    const piece = board[row][col];
    if (piece && piece.color === color) {
      setSelected([row, col]);
      const moves = chessRef.current.moves({ square, verbose: true });
      setHighlight(moves.map(m => algebraicToCoords(m.to)));
      setStatus('');
    }
  }

  function handlePromotion(promotionPiece) {
    if (!promotion) return;
    sendMove({ from: promotion.from, to: promotion.to, promotion: promotionPiece });
    setPromotion(null);
  }

  function sendMove(move) {
    if (!socketRef.current || !joined) return;
    socketRef.current.emit('move', { roomId, move }, ({ success, error }) => {
      if (!success) setStatus(error || 'Invalid move');
    });
  }

  function coordsToAlgebraic(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }
  function algebraicToCoords(str) {
    const col = str.charCodeAt(0) - 97;
    const row = 8 - parseInt(str[1]);
    return [row, col];
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-10">
      {!joined ? (
        <div className="bg-gray-800 rounded-xl p-6 sm:p-10 shadow-2xl border border-gray-700 flex flex-col items-center max-w-lg w-full">
          <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
            <button 
              onClick={onGoBack} 
              className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Back
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">Multiplayer Chess</h2>
          
          <div className="w-full flex items-center justify-center mb-6">
            <div className={`h-3 w-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-300">
              Server status: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex flex-col w-full gap-4 mb-6">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              onClick={createRoom}
              disabled={!isConnected}
            >
              Create Room
            </button>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Room Code" 
                className="w-full flex-1 bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputRoom} 
                onChange={(e) => setInputRoom(e.target.value)}
              />
              <button 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                onClick={joinRoom}
                disabled={!isConnected || !inputRoom}
              >
                Join Room
              </button>
            </div>
          </div>

          <div className="text-yellow-500 mt-6 text-xl">{status}</div>

          {waiting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-4xl">
          <div className="bg-gray-800 rounded-xl p-4 sm:p-10 shadow-2xl border border-gray-700 flex flex-col items-center w-full">
            <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to leave the game? This will disconnect you from the room.')) {
                    window.location.reload();
                  }
                }} 
                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                ← Back to Menu
              </button>
              <div className="text-gray-300 text-xl mt-2 sm:mt-0">Room: <span className="font-bold text-white">{roomId}</span></div>
            </div>
            <div className="text-yellow-500 mb-6 text-lg">{status}</div>
            <div className="relative">
              <div className="flex flex-col">
                {/* Column labels - Hide on small screens */}
                <div className="hidden sm:flex flex-row">
                  <div className="w-8 sm:w-14 h-8 sm:h-14" />
                  {[...Array(8)].map((_, i) => (
                    <div className="w-10 h-8 sm:w-[80px] sm:h-14 flex items-center justify-center text-green-700 text-sm sm:text-xl font-medium" key={i}>{String.fromCharCode(97 + i)}</div>
                  ))}
                </div>
                {/* Rows */}
                {board.map((row, rowIdx) => (
                  <div className="flex flex-row" key={rowIdx}>
                    <div className="w-8 sm:w-14 h-10 sm:h-[80px] flex items-center justify-center text-green-700 text-sm sm:text-xl font-medium">{8 - rowIdx}</div>
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
                            {piece ? (
                              <span 
                                className={`text-2xl sm:text-6xl ${piece.color === 'w' ? 'text-white' : 'text-black'}`}
                                style={needsExtraContrast(rowIdx, colIdx, piece.color) ? highContrastWhitePieceStyle : piece.color === 'w' ? whiteChessPieceStyle : {}}
                              >
                                {piece.unicode || pieceTypeToUnicode(piece)}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full text-center py-3 sm:py-5 bg-gray-100 text-gray-900 font-bold text-lg sm:text-2xl mt-2 rounded-md">
              {turn === 'w' ? "It's White's Turn" : "It's Black's Turn"}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center w-full mt-4 sm:mt-8 px-4 py-4 bg-gray-700 rounded-lg gap-2">
              <div className="text-white text-lg sm:text-xl">
                Turn: <span className="font-semibold">{turn === 'w' ? 'White' : 'Black'}</span>
              </div>
              {gameOver && <span className="text-red-500 text-lg sm:text-xl">{status}</span>}
            </div>
            {promotion && (
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
                          {promotion.color === 'w' 
                            ? pieceTypeToUnicode({ type: p, color: 'w' }) 
                            : pieceTypeToUnicode({ type: p, color: 'b' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
