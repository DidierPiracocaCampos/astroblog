import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['test/unit/**/*.test.ts'] } },
      { test: { name: 'build', include: ['test/build/**/*.test.ts'], testTimeout: 180000 } },
    ],
  },
});
