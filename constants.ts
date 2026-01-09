/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { CutDirection, NoteData, Difficulty, Theme, ColorPalette } from "./types";
import * as THREE from 'three';

// Game World Config
export const TRACK_LENGTH = 50;
export const SPAWN_Z = -30;
export const PLAYER_Z = 0;
export const MISS_Z = 5;

export const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: { speed: 8, label: 'Easy' },
  [Difficulty.MEDIUM]: { speed: 12, label: 'Medium' },
  [Difficulty.HARD]: { speed: 16, label: 'Hard' }
};

export const THEME_PALETTES: Record<Theme, ColorPalette> = {
  [Theme.NEON]: {
    left: '#ef4444', // Red-ish
    right: '#3b82f6', // Blue-ish
    world: {
      sky: '#050505',
      grid: '#333333',
      gridAccent: '#3b82f6',
      text: '#3b82f6'
    }
  },
  [Theme.VAPOR]: {
    left: '#ff00ff', // Magenta
    right: '#00ffff', // Cyan
    world: {
      sky: '#1a0b2e', // Deep Purple
      grid: '#2d0036',
      gridAccent: '#ff00ff',
      text: '#00ffff'
    }
  },
  [Theme.MATRIX]: {
    left: '#ff5500', // Orange (Contrast)
    right: '#00ff00', // Green
    world: {
      sky: '#000000',
      grid: '#001100',
      gridAccent: '#00ff00',
      text: '#00ff00'
    }
  }
};

export const LANE_WIDTH = 0.8;
export const LAYER_HEIGHT = 0.8;
export const NOTE_SIZE = 0.5;

// Positions for the 4 lanes (centered around 0)
export const LANE_X_POSITIONS = [-1.5 * LANE_WIDTH, -0.5 * LANE_WIDTH, 0.5 * LANE_WIDTH, 1.5 * LANE_WIDTH];
export const LAYER_Y_POSITIONS = [0.8, 1.6, 2.4]; // Low, Mid, High

// Audio
// Using a solid rhythmic track that is free to use.
export const SONG_URL = 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg';
export const SONG_BPM = 140; 
const BEAT_TIME = 60 / SONG_BPM;

// Generate a chart based on difficulty
export const generateChart = (difficulty: Difficulty): NoteData[] => {
  const notes: NoteData[] = [];
  let idCount = 0;
  
  // Adjust density based on difficulty
  // Easy: Every 4 beats (approx 1.7s)
  // Medium: Every 2 beats (approx 0.8s)
  // Hard: Every beat (approx 0.4s) + patterns
  
  let step = 4;
  if (difficulty === Difficulty.MEDIUM) step = 2;
  if (difficulty === Difficulty.HARD) step = 1;

  for (let i = 4; i < 200; i += step) { 
    const time = i * BEAT_TIME;
    
    // Pattern generation
    if (difficulty === Difficulty.EASY) {
       // Simple alternating
       const isLeft = (i / 4) % 2 === 0;
       notes.push({
         id: `note-${idCount++}`,
         time,
         lineIndex: isLeft ? 1 : 2,
         lineLayer: 0,
         type: isLeft ? 'left' : 'right',
         cutDirection: CutDirection.ANY
       });
    } else if (difficulty === Difficulty.MEDIUM) {
       // Alternating with some variety
       const isLeft = (i / 2) % 2 === 0;
       // Occasional double hit every 16 beats
       if (i % 16 === 0) {
          notes.push(
            { id: `note-${idCount++}`, time, lineIndex: 1, lineLayer: 0, type: 'left', cutDirection: CutDirection.ANY },
            { id: `note-${idCount++}`, time, lineIndex: 2, lineLayer: 0, type: 'right', cutDirection: CutDirection.ANY }
          );
       } else {
          notes.push({
            id: `note-${idCount++}`,
            time,
            lineIndex: isLeft ? 1 : 2,
            lineLayer: 0, // Keep it simple on layer 0 for medium
            type: isLeft ? 'left' : 'right',
            cutDirection: CutDirection.ANY
          });
       }
    } else {
      // HARD
      // Patterns: 0=Alternate, 1=Double, 2=Stream
      const pattern = Math.floor(i / 16) % 3;

      if (pattern === 0) {
        // Fast Alternating
        const isLeft = i % 2 === 0;
        notes.push({
          id: `note-${idCount++}`,
          time,
          lineIndex: isLeft ? 0 : 3, // Wide lanes
          lineLayer: Math.random() > 0.5 ? 1 : 0,
          type: isLeft ? 'left' : 'right',
          cutDirection: CutDirection.ANY
        });
      } else if (pattern === 1) {
        // Doubles
         if (i % 2 === 0) {
           notes.push(
             { id: `note-${idCount++}`, time, lineIndex: 1, lineLayer: 0, type: 'left', cutDirection: CutDirection.ANY },
             { id: `note-${idCount++}`, time, lineIndex: 2, lineLayer: 0, type: 'right', cutDirection: CutDirection.ANY }
           );
         }
      } else {
        // Streams/stairs
        const offset = i % 4;
        notes.push({
          id: `note-${idCount++}`,
          time,
          lineIndex: offset,
          lineLayer: 0,
          type: offset < 2 ? 'left' : 'right',
          cutDirection: CutDirection.ANY
        });
      }
    }
  }

  return notes.sort((a, b) => a.time - b.time);
};

// Vectors for direction checking
export const DIRECTION_VECTORS: Record<CutDirection, THREE.Vector3> = {
  [CutDirection.UP]: new THREE.Vector3(0, 1, 0),
  [CutDirection.DOWN]: new THREE.Vector3(0, -1, 0),
  [CutDirection.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CutDirection.RIGHT]: new THREE.Vector3(1, 0, 0),
  [CutDirection.ANY]: new THREE.Vector3(0, 0, 0) // Magnitude check only
};