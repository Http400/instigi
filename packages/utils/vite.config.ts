import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        client: resolve(__dirname, 'src/client.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['express', 'jsonwebtoken'],
    },
  },
  plugins: [
    dts({
      include: ['src'],
      insertTypesEntry: true,
    }),
  ],
});
