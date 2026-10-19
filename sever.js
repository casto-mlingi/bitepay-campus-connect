import { nodeServer } from './.output/server/index.mjs'; // or your built output path
// Alternatively, if running Nitro directly:
import process from 'node:process';

process.env.NITRO_HOST = '0.0.0.0';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || 3000;

// Import and run the compiled Nitro server
import('./.output/server/index.mjs');
