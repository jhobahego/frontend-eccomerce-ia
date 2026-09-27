import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // Constitution §6: lines ≥ 80 % on covered code. Views stay lower by
      // design (their flows are pinned by e2e instead); the floor holds on
      // the aggregate the suite above actually measures.
      coverage: {
        thresholds: { lines: 80 },
      },
    },
  }),
)
