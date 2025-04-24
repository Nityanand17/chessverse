import React, { useState } from 'react';
import Landing from './pages/Landing';
import ColorSelect from './components/ColorSelect';
import ChessBoard from './components/ChessBoard';
import Multiplayer from './pages/Multiplayer';

function App() {
  const [mode, setMode] = useState(null); // 'ai' or 'multiplayer'
  const [playerColor, setPlayerColor] = useState(null);
  const [apiKey, setApiKey] = useState('');

  if (!mode) {
    return <Landing onModeSelect={setMode} />;
  }
  
  if (mode === 'ai') {
    if (!playerColor) {
      return <ColorSelect onSelect={setPlayerColor} setApiKey={setApiKey} />;
    }
    return <ChessBoard playerColor={playerColor} apiKey={apiKey} />;
  }
  
  if (mode === 'multiplayer') {
    return <Multiplayer onGoBack={() => setMode(null)} />;
  }
}

export default App;
