// Standalone build of the game only (play.html): no router, no storage beyond one localStorage key.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './Game';

document.body.style.margin = '0';
document.body.style.background = '#000';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
