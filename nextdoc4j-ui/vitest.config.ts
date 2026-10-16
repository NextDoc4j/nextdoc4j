import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    clearMocks: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
