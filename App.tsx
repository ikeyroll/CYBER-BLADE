/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader, useProgress } from '@react-three/drei';
import { GameStatus, NoteData, Difficulty, Theme } from './types';
import { SONG_URL, SONG_BPM, DIFFICULTY_SETTINGS, THEME_PALETTES, generateChart } from './constants';
import { useMediaPipe } from './hooks/useMediaPipe';
import GameScene from './components/GameScene';
import WebcamPreview from './components/WebcamPreview';
import { Play, RefreshCw, VideoOff, Hand, Sparkles, Pause, X, PlayCircle, Activity, Zap, Trophy, Skull, Palette } from 'lucide-react';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOADING);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [health, setHealth] = useState(100);
  
  // Game Settings
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [theme, setTheme] = useState<Theme>(Theme.NEON);
  const [chart, setChart] = useState<NoteData[]>([]);

  const audioRef = useRef<HTMLAudioElement>(new Audio(SONG_URL));
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Now getting lastResultsRef from the hook
  const { isCameraReady, handPositionsRef, lastResultsRef, error: cameraError } = useMediaPipe(videoRef);

  // Derived colors based on current theme
  const colors = THEME_PALETTES[theme];

  // Game Logic Handlers
  const handleNoteHit = useCallback((note: NoteData, goodCut: boolean) => {
     let points = 100;
     if (goodCut) points += 50; 

     // Haptic feedback for impact
     if (navigator.vibrate) {
         navigator.vibrate(goodCut ? 40 : 20);
     }

     setCombo(c => {
       const newCombo = c + 1;
       if (newCombo > 30) setMultiplier(8);
       else if (newCombo > 20) setMultiplier(4);
       else if (newCombo > 10) setMultiplier(2);
       else setMultiplier(1);
       return newCombo;
     });

     setScore(s => s + (points * multiplier));
     setHealth(h => Math.min(100, h + 2));
  }, [multiplier]);

  const handleNoteMiss = useCallback((note: NoteData) => {
      setCombo(0);
      setMultiplier(1);
      setHealth(h => {
          const newHealth = h - 15;
          if (newHealth <= 0) {
             setTimeout(() => endGame(false), 0);
             return 0;
          }
          return newHealth;
      });
  }, []);

  const startGame = async () => {
    if (!isCameraReady) return;
    
    setScore(0);
    setCombo(0);
    setMultiplier(1);
    setHealth(100);

    const newChart = generateChart(difficulty);
    setChart(newChart);

    try {
      if (audioRef.current) {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setGameStatus(GameStatus.PLAYING);
      }
    } catch (e) {
        console.error("Audio play failed", e);
        alert("Could not start audio. Please interact with the page first.");
    }
  };

  const togglePause = () => {
      if (gameStatus === GameStatus.PLAYING) {
          audioRef.current.pause();
          setGameStatus(GameStatus.PAUSED);
      } else if (gameStatus === GameStatus.PAUSED) {
          audioRef.current.play();
          setGameStatus(GameStatus.PLAYING);
      }
  };

  const quitGame = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
      setGameStatus(GameStatus.IDLE);
  };

  const endGame = (victory: boolean) => {
      setGameStatus(victory ? GameStatus.VICTORY : GameStatus.GAME_OVER);
      if (audioRef.current) {
          audioRef.current.pause();
      }
  };

  useEffect(() => {
      console.log('Game Status:', gameStatus, 'Camera Ready:', isCameraReady);
      if (gameStatus === GameStatus.LOADING && isCameraReady) {
          setGameStatus(GameStatus.IDLE);
      }
  }, [isCameraReady, gameStatus]);

  // Pre-load chart to avoid empty render on first load
  useEffect(() => {
      if (chart.length === 0) {
          setChart(generateChart(difficulty));
      }
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* Hidden Video for Processing */}
      <video 
        ref={videoRef} 
        className="absolute opacity-0 pointer-events-none"
        playsInline
        muted
        autoPlay
        style={{ width: '640px', height: '480px' }}
      />

      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]}>
          {gameStatus !== GameStatus.LOADING && (
             <GameScene 
                gameStatus={gameStatus}
                audioRef={audioRef}
                handPositionsRef={handPositionsRef}
                chart={chart}
                noteSpeed={DIFFICULTY_SETTINGS[difficulty].speed}
                colors={colors}
                onNoteHit={handleNoteHit}
                onNoteMiss={handleNoteMiss}
                onSongEnd={() => endGame(true)}
             />
          )}
      </Canvas>
      
      {/* Overlay Scanlines/Vignette */}
      <div className="absolute inset-0 pointer-events-none scanline opacity-20 z-10"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/80 z-0"></div>

      {/* Webcam Mini-Map Preview */}
      <WebcamPreview 
          videoRef={videoRef} 
          resultsRef={lastResultsRef} 
          isCameraReady={isCameraReady} 
          colors={colors}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-20">
          
          {/* HUD (Top) */}
          <div className="flex justify-between items-start text-white w-full">
             
             {/* Health & Status Module */}
             <div className="w-1/3 max-w-[200px] pointer-events-auto cyber-clip-path bg-black/60 border-l-2 border-t-2 backdrop-blur-md p-4" style={{ borderColor: `${colors.world.text}80` }}>
                 <div className="flex items-center justify-between mb-2">
                     <span className="font-orbitron text-xs" style={{ color: colors.world.text }}>INTEGRITY</span>
                     <Activity className="w-4 h-4" style={{ color: colors.world.text }} />
                 </div>
                 <div className="h-2 bg-gray-800 rounded-sm overflow-hidden mb-2">
                     <div 
                        className={`h-full transition-all duration-300 ease-out shadow-[0_0_10px_currentColor] ${health > 50 ? 'bg-cyan-400 text-cyan-400' : health > 20 ? 'bg-yellow-400 text-yellow-400' : 'bg-red-500 text-red-500'}`}
                        style={{ width: `${health}%` }}
                     />
                 </div>
                 {gameStatus === GameStatus.PLAYING && (
                     <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-rajdhani font-bold px-2 py-0.5 rounded border ${
                             difficulty === Difficulty.HARD ? 'border-red-500 text-red-400 bg-red-900/20' : 
                             difficulty === Difficulty.MEDIUM ? 'border-blue-500 text-blue-400 bg-blue-900/20' : 
                             'border-green-500 text-green-400 bg-green-900/20'
                         }`}>
                             {DIFFICULTY_SETTINGS[difficulty].label.toUpperCase()}
                         </span>
                     </div>
                 )}
             </div>

             {/* Score & Combo */}
             <div className="text-center relative top-2">
                 <h1 className="font-orbitron text-4xl md:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                     {score.toLocaleString()}
                 </h1>
                 <div className="mt-2 flex flex-col items-center">
                     <div className={`flex items-center gap-2 transition-all duration-200 ${combo > 0 ? 'opacity-100' : 'opacity-0'}`}>
                         <span className={`font-rajdhani text-2xl md:text-4xl font-bold italic ${combo > 20 ? 'text-yellow-400 text-glow-white' : 'text-blue-300'}`}>
                             {combo}
                         </span>
                         <span className="text-xs font-orbitron tracking-widest" style={{ color: colors.world.text }}>COMBO</span>
                     </div>
                     
                     {multiplier > 1 && (
                         <div className="mt-1 font-orbitron text-sm px-3 py-1 bg-blue-600/20 border border-blue-400/50 rounded text-blue-200 animate-pulse flex items-center gap-1">
                             <Zap className="w-3 h-3 fill-current" />
                             {multiplier}X MULTIPLIER
                         </div>
                     )}
                 </div>
             </div>
             
             {/* Pause Button */}
             <div className="w-1/3 flex justify-end">
                {(gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.PAUSED) && (
                    <button 
                        onClick={togglePause}
                        className="pointer-events-auto cyber-button-clip bg-blue-600/20 hover:bg-blue-600/40 border-r-2 border-b-2 text-white p-3 backdrop-blur-md transition-all group"
                        style={{ borderColor: colors.world.text }}
                    >
                        {gameStatus === GameStatus.PAUSED ? 
                            <PlayCircle className="w-8 h-8 group-hover:text-white transition-colors" style={{ color: colors.world.text }} /> : 
                            <Pause className="w-8 h-8 group-hover:text-white transition-colors" style={{ color: colors.world.text }} />
                        }
                    </button>
                )}
             </div>
          </div>

          {/* Menus (Centered) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-30">
              
              {/* PAUSE MENU */}
              {gameStatus === GameStatus.PAUSED && (
                  <div className="relative bg-black/80 p-12 w-full max-w-md text-center border-y-2 border-yellow-500/50 backdrop-blur-xl cyber-clip-path">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                      <h2 className="font-orbitron text-5xl font-bold text-yellow-500 mb-8 tracking-wider text-glow-white">PAUSED</h2>
                      <div className="flex flex-col gap-6 font-rajdhani">
                          <button 
                              onClick={togglePause}
                              className="cyber-button-clip bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500 text-yellow-100 text-2xl font-bold py-4 px-12 transition-all tracking-widest hover:text-white hover:scale-105"
                          >
                              RESUME
                          </button>
                          <button 
                              onClick={quitGame}
                              className="cyber-button-clip bg-red-600/20 hover:bg-red-600/40 border border-red-600 text-red-200 text-2xl font-bold py-4 px-12 transition-all tracking-widest hover:text-white hover:scale-105"
                          >
                              ABORT
                          </button>
                      </div>
                  </div>
              )}

              {gameStatus === GameStatus.LOADING && (
                  <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-6">
                          <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor: `${colors.world.text}33` }}></div>
                          <div className="absolute inset-0 border-t-4 rounded-full animate-spin" style={{ borderColor: colors.world.text }}></div>
                      </div>
                      <h2 className="font-orbitron text-2xl text-white font-bold mb-2 tracking-widest animate-pulse">INITIALIZING</h2>
                      <p className="font-rajdhani tracking-wider" style={{ color: colors.world.text }}>
                          {!isCameraReady ? "ESTABLISHING OPTICAL LINK..." : "LOADING ASSETS..."}
                      </p>
                      {cameraError && (
                          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 text-red-200 max-w-xs text-center font-mono text-xs">
                              ERROR: {cameraError}
                          </div>
                      )}
                  </div>
              )}

              {gameStatus === GameStatus.IDLE && (
                  <div className="relative w-full max-w-3xl flex flex-col items-center">
                      {/* Hero Title */}
                      <div className="text-center mb-8 relative">
                          <div className="absolute -inset-10 blur-3xl rounded-full" style={{ backgroundColor: `${colors.world.text}1A` }}></div>
                          <h1 className="font-orbitron text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                              CYBER <br/><span style={{ color: colors.world.text }}>BLADE</span>
                          </h1>
                          <p className="font-rajdhani text-xl text-blue-200 tracking-[0.5em] opacity-80">RHYTHM ACTION SEQUENCE</p>
                      </div>
                      
                      {/* Main Menu Card */}
                      <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 md:p-10 w-full cyber-clip-path relative">
                          {/* Corner Accents */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: colors.world.text }}></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: colors.world.text }}></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: colors.world.text }}></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: colors.world.text }}></div>

                          {/* Instructions */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                              <div className="p-4 border border-blue-500/30" style={{ backgroundColor: `${colors.world.text}1A` }}>
                                  <div className="flex items-center gap-3 mb-2" style={{ color: colors.right }}>
                                      <Hand className="w-5 h-5" />
                                      <span className="font-orbitron text-xs">VISUAL SENSOR</span>
                                  </div>
                                  <p className="font-rajdhani text-sm text-gray-300 leading-tight">
                                      Ensure your upper body and hands are clearly visible within the frame.
                                  </p>
                              </div>
                              <div className="p-4 border border-red-500/30" style={{ backgroundColor: `${colors.left}1A` }}>
                                  <div className="flex items-center gap-3 mb-2" style={{ color: colors.left }}>
                                      <Zap className="w-5 h-5" />
                                      <span className="font-orbitron text-xs">COMBAT PROTOCOL</span>
                                  </div>
                                  <p className="font-rajdhani text-sm text-gray-300 leading-tight">
                                      Use <span className="font-bold" style={{ color: colors.left }}>LEFT</span> and <span className="font-bold" style={{ color: colors.right }}>RIGHT</span> hands to intercept incoming targets.
                                  </p>
                              </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-8 justify-center mb-8">
                              {/* Difficulty Selection */}
                              <div className="text-center">
                                  <p className="font-orbitron text-xs text-blue-300/60 mb-3 tracking-widest">DIFFICULTY</p>
                                  <div className="flex justify-center gap-2">
                                      {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => (
                                          <button
                                              key={d}
                                              onClick={() => setDifficulty(d)}
                                              className={`relative px-4 py-2 font-orbitron font-bold text-xs tracking-wider transition-all cyber-button-clip ${
                                                  difficulty === d 
                                                    ? 'text-white shadow-[0_0_15px_rgba(37,99,235,0.6)] scale-110 z-10' 
                                                    : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                                              }`}
                                              style={{ backgroundColor: difficulty === d ? colors.world.gridAccent : undefined }}
                                          >
                                              {DIFFICULTY_SETTINGS[d].label.toUpperCase()}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {/* Theme Selection */}
                              <div className="text-center">
                                  <p className="font-orbitron text-xs text-blue-300/60 mb-3 tracking-widest">THEME</p>
                                  <div className="flex justify-center gap-2">
                                      {(Object.keys(THEME_PALETTES) as Theme[]).map((t) => (
                                          <button
                                              key={t}
                                              onClick={() => setTheme(t)}
                                              className={`relative px-4 py-2 font-orbitron font-bold text-xs tracking-wider transition-all cyber-button-clip ${
                                                  theme === t 
                                                    ? 'text-white shadow-[0_0_15px_rgba(37,99,235,0.6)] scale-110 z-10' 
                                                    : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                                              }`}
                                              style={{ backgroundColor: theme === t ? THEME_PALETTES[t].world.gridAccent : undefined }}
                                          >
                                              {t}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          {/* Action Button */}
                          <div className="text-center">
                               {!isCameraReady ? (
                                   <div className="inline-flex items-center justify-center gap-3 text-red-400 bg-red-950/30 px-6 py-3 rounded border border-red-900/50 font-rajdhani animate-pulse">
                                       <VideoOff className="w-5 h-5" /> 
                                       <span>WAITING FOR CAMERA FEED...</span>
                                   </div>
                               ) : (
                                  <button 
                                      onClick={startGame}
                                      className="group relative inline-flex items-center justify-center py-4 px-16 bg-white text-black font-orbitron font-black text-xl tracking-widest hover:text-white transition-all duration-300 cyber-button-clip shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] hover:scale-105"
                                      style={{ "--hover-color": colors.world.gridAccent } as React.CSSProperties}
                                  >
                                      <div className="absolute inset-0 bg-white group-hover:bg-blue-500 transition-colors duration-300 -z-10" style={{ backgroundColor: undefined }}></div> 
                                      {/* Note: Tailwind hover is hardcoded to blue-400 in class, overriding with style is tricky for hover. 
                                          We stick to standard white->blue hover for simplicity or use inline styles for hover states if critical. 
                                          For now keeping standard blue hover effect. */}
                                      <Play className="w-6 h-6 mr-3 fill-current" />
                                      ENGAGE
                                  </button>
                               )}
                          </div>
                      </div>
                      
                      <div className="mt-8 font-rajdhani text-white/20 text-xs tracking-widest">
                           SYSTEM VERSION 2.1.0 | DEVELOPED BY <span className="text-white/40 hover:text-blue-400 transition-colors cursor-pointer">@AMMAAR</span>
                      </div>
                  </div>
              )}

              {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
                  <div className="bg-black/90 p-12 w-full max-w-lg text-center border border-white/10 backdrop-blur-xl cyber-clip-path relative">
                       <div className={`absolute top-0 left-0 w-full h-1 ${gameStatus === GameStatus.VICTORY ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_20px_currentColor]`}></div>
                      
                      <div className="mb-6 flex justify-center">
                          {gameStatus === GameStatus.VICTORY ? 
                              <Trophy className="w-20 h-20 text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" /> : 
                              <Skull className="w-20 h-20 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                          }
                      </div>

                      <h2 className={`font-orbitron text-4xl md:text-5xl font-bold mb-2 tracking-wider ${gameStatus === GameStatus.VICTORY ? 'text-green-400' : 'text-red-500'}`}>
                          {gameStatus === GameStatus.VICTORY ? "MISSION CLEAR" : "SYSTEM FAILURE"}
                      </h2>
                      <p className="font-rajdhani text-gray-400 mb-8 uppercase tracking-widest">
                          {gameStatus === GameStatus.VICTORY ? "Target Elimination Complete" : "Critical Damage Sustained"}
                      </p>

                      <div className="bg-white/5 p-6 mb-8 border border-white/10">
                          <p className="font-rajdhani text-sm text-gray-400 uppercase mb-1">Final Score</p>
                          <p className="font-orbitron text-4xl text-white font-bold">{score.toLocaleString()}</p>
                      </div>
                      
                      <div className="flex gap-4 justify-center">
                          <button 
                              onClick={() => setGameStatus(GameStatus.IDLE)}
                              className="cyber-button-clip bg-white text-black hover:bg-blue-400 hover:text-white text-lg font-bold py-4 px-10 flex items-center justify-center gap-2 transition-all font-orbitron tracking-wider"
                          >
                              <RefreshCw className="w-5 h-5" /> REBOOT
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default App;