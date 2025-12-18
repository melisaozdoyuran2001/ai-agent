import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_CACHE_DIR = path.resolve(__dirname, 'cache');
