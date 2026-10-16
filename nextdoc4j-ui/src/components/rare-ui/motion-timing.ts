// Shared timings for the local Rare UI adaptations: quiet collapse, movement and feedback.
export const UI_MOTION = {
  collapse: 180,
  move: 220,
  feedback: 120,
  ease: [0.2, 0.8, 0.2, 1],
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;
