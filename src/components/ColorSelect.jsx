import React, { useState } from 'react';

export default function ColorSelect({ onSelect, setApiKey }) {
  const [color, setColor] = useState('w');
  const [key, setKey] = useState('');
  return (
    <div className="flex h-screen items-center justify-center bg-black text-white p-4">
      <div className="flex flex-col items-center bg-black shadow-xl p-4 sm:p-8 w-full max-w-md">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            ← Back to Menu
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-200 mt-3 sm:mt-0">Choose Your Color</h2>
        </div>
        <div className="flex justify-center space-x-4 my-5 w-full">
          <button 
            className={`w-full px-5 sm:px-7 py-3 text-base sm:text-lg rounded-lg border-2 transition-colors ${
              color === 'w' 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-gray-800 text-gray-200 border-blue-400 hover:bg-blue-600'
            }`} 
            onClick={() => setColor('w')}
          >
            White
          </button>
          <button 
            className={`w-full px-5 sm:px-7 py-3 text-base sm:text-lg rounded-lg border-2 transition-colors ${
              color === 'b' 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-gray-800 text-gray-200 border-blue-400 hover:bg-blue-600'
            }`} 
            onClick={() => setColor('b')}
          >
            Black
          </button>
        </div>
        <input
          type="password"
          placeholder="Gemini API Key (optional)"
          value={key}
          onChange={e => setKey(e.target.value)}
          className="w-full py-2 px-3 my-4 bg-gray-800 border border-gray-600 rounded-md text-white"
        />
        <button
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg text-base sm:text-lg font-semibold mt-2 transition-colors"
          disabled={!color}
          onClick={() => {
            setApiKey(key);
            onSelect(color);
          }}
        >
          Start Game
        </button>
        <div className="mt-5 text-gray-400 text-xs sm:text-sm text-center">You can leave the API key blank for random-move AI.</div>
      </div>
    </div>
  );
}
