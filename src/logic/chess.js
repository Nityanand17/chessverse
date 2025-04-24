// Core chess logic ported from script.js (to be used in React)
// Board state, move generation, and game logic as pure JS functions/classes.

export const PIECE_UNICODE = {
  w_king: '\u2654',
  w_queen: '\u2655',
  w_rook: '\u2656',
  w_bishop: '\u2657',
  w_knight: '\u2658',
  w_pawn: '\u2659',
  b_king: '\u265A',
  b_queen: '\u265B',
  b_rook: '\u265C',
  b_bishop: '\u265D',
  b_knight: '\u265E',
  b_pawn: '\u265F',
};

// Initial board state as a 2D array (8x8)
export function getInitialBoard() {
  const empty = Array(8).fill(null).map(() => Array(8).fill(null));
  const board = JSON.parse(JSON.stringify(empty));
  // Place black pieces
  board[0] = [
    'b_rook', 'b_knight', 'b_bishop', 'b_queen', 'b_king', 'b_bishop', 'b_knight', 'b_rook',
  ];
  board[1] = Array(8).fill('b_pawn');
  // Place white pieces
  board[6] = Array(8).fill('w_pawn');
  board[7] = [
    'w_rook', 'w_knight', 'w_bishop', 'w_queen', 'w_king', 'w_bishop', 'w_knight', 'w_rook',
  ];
  return board;
}

// Helper: convert board coords to algebraic (e.g. [7,0] => 'a1')
export function toAlgebraic([row, col]) {
  return String.fromCharCode(97 + col) + (8 - row);
}

// Helper: convert algebraic to board coords (e.g. 'a1' => [7,0])
export function fromAlgebraic(str) {
  const col = str.charCodeAt(0) - 97;
  const row = 8 - parseInt(str[1]);
  return [row, col];
}

// Utility to clone a board (deep copy)
export function cloneBoard(board) {
  return board.map(row => row.slice());
}

// Get all pieces with their positions
export function getPieces(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]) {
        pieces.push({
          type: board[r][c],
          color: board[r][c][0],
          pos: [r, c],
        });
      }
    }
  }
  return pieces;
}

// Check if a square is inside the board
export function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Helper: Find king position
function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}_king`) return [r, c];
    }
  }
  return null;
}

// Helper: Check if a move leaves king in check
function wouldLeaveKingInCheck(board, from, to, color, movedMap, enPassantTarget) {
  // Make the move on a clone
  const testBoard = cloneBoard(board);
  const piece = testBoard[from[0]][from[1]];
  testBoard[from[0]][from[1]] = null;
  testBoard[to[0]][to[1]] = piece;
  // Handle en passant
  if (piece && piece.slice(2) === 'pawn' && to[1] !== from[1] && !board[to[0]][to[1]]) {
    // Capturing pawn en passant
    testBoard[from[0]][to[1]] = null;
  }
  const kingPos = findKing(testBoard, color);
  // Check if king is attacked
  return isAttacked(testBoard, kingPos, color === 'w' ? 'b' : 'w');
}

// Helper: Is a square attacked by opponent?
function isAttacked(board, pos, attackerColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece[0] === attackerColor) {
        const moves = getValidMoves(board, r, c, {}, null, true);
        if (moves.some(([mr, mc]) => mr === pos[0] && mc === pos[1])) {
          return true;
        }
      }
    }
  }
  return false;
}

// Generate all valid moves for a piece at (row, col)
export function getValidMoves(board, row, col, movedMap = {}, enPassantTarget = null, ignoreKingSafety = false) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = piece[0];
  const type = piece.slice(2);
  let moves = [];
  // Directions for sliding pieces
  const directions = {
    rook: [
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ],
    bishop: [
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ],
    queen: [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]
    ],
    knight: [
      [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]
    ],
    king: [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]
    ]
  };

  if (type === 'pawn') {
    const dir = color === 'w' ? -1 : 1;
    // Forward move
    if (inBounds(row + dir, col) && !board[row + dir][col]) {
      moves.push([row + dir, col]);
      // Double move from starting rank
      if ((color === 'w' && row === 6) || (color === 'b' && row === 1)) {
        if (!board[row + dir * 2][col]) {
          moves.push([row + dir * 2, col]);
        }
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      if (inBounds(row + dir, col + dc) && board[row + dir][col + dc] && board[row + dir][col + dc][0] !== color) {
        moves.push([row + dir, col + dc]);
      }
    }
    // En passant
    if (enPassantTarget) {
      if (row === (color === 'w' ? 3 : 4)) {
        for (const dc of [-1, 1]) {
          if (col + dc === enPassantTarget[1] && row + dir === enPassantTarget[0]) {
            moves.push([row + dir, col + dc]);
          }
        }
      }
    }
  } else if (type === 'knight') {
    for (const [dr, dc] of directions.knight) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] !== color)) {
        moves.push([nr, nc]);
      }
    }
  } else if (type === 'bishop' || type === 'rook' || type === 'queen') {
    const dirs = directions[type];
    for (const [dr, dc] of dirs) {
      let nr = row + dr, nc = col + dc;
      while (inBounds(nr, nc)) {
        if (!board[nr][nc]) {
          moves.push([nr, nc]);
        } else {
          if (board[nr][nc][0] !== color) moves.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (type === 'king') {
    for (const [dr, dc] of directions.king) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] !== color)) {
        moves.push([nr, nc]);
      }
    }
    // Castling
    if (!movedMap[toAlgebraic([row, col])]) {
      // Kingside
      if (!movedMap[toAlgebraic([row, 7])] &&
          board[row][5] === null && board[row][6] === null &&
          !isAttacked(board, [row, 4], color === 'w' ? 'b' : 'w') &&
          !isAttacked(board, [row, 5], color === 'w' ? 'b' : 'w') &&
          !isAttacked(board, [row, 6], color === 'w' ? 'b' : 'w')) {
        moves.push([row, 6]);
      }
      // Queenside
      if (!movedMap[toAlgebraic([row, 0])] &&
          board[row][1] === null && board[row][2] === null && board[row][3] === null &&
          !isAttacked(board, [row, 4], color === 'w' ? 'b' : 'w') &&
          !isAttacked(board, [row, 3], color === 'w' ? 'b' : 'w') &&
          !isAttacked(board, [row, 2], color === 'w' ? 'b' : 'w')) {
        moves.push([row, 2]);
      }
    }
  }
  // Remove moves that leave king in check
  if (!ignoreKingSafety) {
    moves = moves.filter(move => !wouldLeaveKingInCheck(board, [row, col], move, color, movedMap, enPassantTarget));
  }
  return moves;
}

// Move a piece (returns new board and updates movedMap)
export function movePiece(board, from, to, movedMap = {}, promoteTo = 'queen', enPassantTarget = null) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[from[0]][from[1]];
  const type = piece.slice(2);
  let newMovedMap = { ...movedMap };
  let newEnPassantTarget = null;
  let promotion = null;
  // Normal move
  newBoard[from[0]][from[1]] = null;
  // En passant
  if (type === 'pawn' && to[1] !== from[1] && !board[to[0]][to[1]]) {
    newBoard[from[0]][to[1]] = null;
  }
  // Castling
  if (type === 'king' && Math.abs(to[1] - from[1]) === 2) {
    if (to[1] === 6) { // Kingside
      newBoard[from[0]][5] = newBoard[from[0]][7];
      newBoard[from[0]][7] = null;
    } else if (to[1] === 2) { // Queenside
      newBoard[from[0]][3] = newBoard[from[0]][0];
      newBoard[from[0]][0] = null;
    }
  }
  // Pawn promotion
  if (type === 'pawn' && (to[0] === 0 || to[0] === 7)) {
    newBoard[to[0]][to[1]] = piece[0] + '_' + promoteTo;
    promotion = promoteTo;
  } else {
    newBoard[to[0]][to[1]] = piece;
  }
  // Set moved flags
  newMovedMap[toAlgebraic(from)] = true;
  if (type === 'rook') newMovedMap[toAlgebraic(from)] = true;
  if (type === 'king') newMovedMap[toAlgebraic(from)] = true;
  // Set en passant target
  if (type === 'pawn' && Math.abs(to[0] - from[0]) === 2) {
    newEnPassantTarget = [from[0] + (to[0] - from[0]) / 2, from[1]];
  }
  return { board: newBoard, movedMap: newMovedMap, enPassantTarget: newEnPassantTarget, promotion };
}

// Check, Checkmate, Stalemate
export function isCheck(board, color, movedMap = {}, enPassantTarget = null) {
  const kingPos = findKing(board, color);
  return isAttacked(board, kingPos, color === 'w' ? 'b' : 'w');
}
export function isCheckmate(board, color, movedMap = {}, enPassantTarget = null) {
  if (!isCheck(board, color, movedMap, enPassantTarget)) return false;
  return getAllValidMoves(board, color, movedMap, enPassantTarget).length === 0;
}
export function isStalemate(board, color, movedMap = {}, enPassantTarget = null) {
  if (isCheck(board, color, movedMap, enPassantTarget)) return false;
  return getAllValidMoves(board, color, movedMap, enPassantTarget).length === 0;
}

// All valid moves for player
export function getAllValidMoves(board, color, movedMap = {}, enPassantTarget = null) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c][0] === color) {
        const pieceMoves = getValidMoves(board, r, c, movedMap, enPassantTarget);
        for (const move of pieceMoves) {
          moves.push({ from: [r, c], to: move });
        }
      }
    }
  }
  return moves;
}

// This file can be extended with more logic as needed.
