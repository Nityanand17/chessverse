import React, { useState, useEffect } from 'react';

export default function Landing({ onModeSelect }) {
  // Animation states
  const [loaded, setLoaded] = useState(false);
  
  // Set loaded to true after component mounts to trigger animations
  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 sm:p-10 relative overflow-hidden">
      {/* Animated background image with blur */}
      <div 
        className="absolute inset-0 bg-center z-0 transition-all duration-[20s] ease-in-out"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1529699211952-734e80c4d42b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
          backgroundSize: '110%',
          backgroundPosition: 'center',
          filter: 'blur(4px) brightness(0.4)',
          transform: `scale(${loaded ? '1.15' : '1.1'})`,
          animation: loaded ? 'subtle-pulse 15s infinite alternate' : 'none'
        }}
      />
      
      {/* Decorative chess pieces - larger size */}
      <div className="absolute top-[10%] left-[15%] text-white text-9xl opacity-25 animate-float-slow hidden md:block" style={{ animationDelay: '0s' }}>♞</div>
      <div className="absolute bottom-[15%] right-[10%] text-white text-9xl opacity-25 animate-float-slow hidden md:block" style={{ animationDelay: '2s' }}>♜</div>
      <div className="absolute top-[20%] right-[20%] text-white text-8xl opacity-20 animate-float-slow hidden md:block" style={{ animationDelay: '4s' }}>♝</div>
      <div className="absolute bottom-[20%] left-[15%] text-white text-8xl opacity-20 animate-float-slow hidden md:block" style={{ animationDelay: '6s' }}>♛</div>
      
      {/* Content (positioned on top of the blurred background) */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <h1 
          className={`text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 mb-6 sm:mb-10 tracking-wider text-center transition-all duration-1000 transform ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
        >
          ChessVerse
        </h1>
        
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          <button 
            className={`relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white py-4 sm:py-5 px-6 rounded-xl text-lg sm:text-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-blue-500/25 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            style={{ transitionDelay: '200ms' }}
            onClick={() => onModeSelect('ai')}
          >
            <span className="relative z-10">Play Against AI</span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
          </button>
          
          <button 
            className={`relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 sm:py-5 px-6 rounded-xl text-lg sm:text-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-purple-500/25 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            style={{ transitionDelay: '300ms' }}
            onClick={() => onModeSelect('multiplayer')}
          >
            <span className="relative z-10">Multiplayer</span>
            <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>
        
        <div 
          className={`mt-10 sm:mt-12 text-gray-300 text-base sm:text-lg text-center px-4 transition-all duration-1000 ${loaded ? 'translate-y-0 opacity-80' : 'translate-y-10 opacity-0'}`}
          style={{ transitionDelay: '400ms' }}
        >
          A multiplayer chess universe.
        </div>
      </div>
      
      {/* Footer with GitHub icon */}
      <div 
        className={`absolute bottom-4 w-full flex flex-col items-center justify-center transition-all duration-1000 z-10 ${loaded ? 'translate-y-0 opacity-70' : 'translate-y-10 opacity-0'}`}
        style={{ transitionDelay: '600ms' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <a 
            href="https://github.com/Nityanand17/chessverse" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-white opacity-80 hover:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
        </div>
        <div className="text-gray-300 text-sm sm:text-base font-medium">
          © ChessVerse 2025.All Rights Reserved.
        </div>
      </div>
      
      {/* CSS animations */}
      <style jsx>{`
        @keyframes subtle-pulse {
          0% { filter: blur(4px) brightness(0.4); }
          100% { filter: blur(4px) brightness(0.5); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .animate-float-slow {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
