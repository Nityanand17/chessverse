import React from 'react';

// Map of chess piece types to Unicode characters
const pieceMap = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

// Style for white pieces to add contrast
const whiteStyle = {
  WebkitTextStroke: '0.3px black',
  textStroke: '0.3px black'
};

export default function Piece({ type, color }) {
  if (!type || !color) return null;
  
  const pieceType = type.toLowerCase();
  const pieceColor = color.toLowerCase();
  const unicode = pieceMap[pieceColor]?.[pieceType] || '';
  
  return (
    <span 
      className={`text-6xl ${pieceColor === 'w' ? 'text-white' : 'text-black'}`}
      style={pieceColor === 'w' ? whiteStyle : {}}
    >
      {unicode}
    </span>
  );
} 