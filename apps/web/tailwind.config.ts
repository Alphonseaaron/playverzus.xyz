import type { Config } from 'tailwindcss';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const preset = require('@playverzus/config/tailwind/preset.js');

const webSrc = path.resolve(__dirname, 'src/**/*.{ts,tsx}').replace(/\\/g, '/');
const uiSrc = path.resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}').replace(/\\/g, '/');

const config: Config = {
  presets: [preset],
  content: [
    webSrc,
    uiSrc,
    './src/**/*.{ts,tsx}',
    './apps/web/src/**/*.{ts,tsx}',
  ],
};

export default config;
