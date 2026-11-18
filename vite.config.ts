import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { iwsdkDev } from '@iwsdk/vite-plugin-dev';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ttsMemCache = new Map<string, { buf: Buffer; mime: string }>();

const ALLOWED_MMS_MODELS = new Set([
  'mms:facebook/mms-tts-yor',
  'mms:facebook/mms-tts-hau',
  'mms:Shinzmann/soro-tts-ibo',
]);

function isValidVoice(voice: string): boolean {
  return ALLOWED_MMS_MODELS.has(voice) || /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice);
}

function coachTtsPlugin(): Plugin {
  let worker: ChildProcessWithoutNullStreams | null = null;
  let seq = 0;
  const pending = new Map<
    string,
    {
      resolve: (res: { ok: boolean; mime?: string; error?: string }) => void;
      timer: NodeJS.Timeout;
    }
  >();

  function ensureWorker(): ChildProcessWithoutNullStreams {
    if (worker && !worker.killed) return worker;
    const uvBin = fs.existsSync('/Users/taiwrash/.local/bin/uv') ? '/Users/taiwrash/.local/bin/uv' : 'uv';
    const workerScript = path.join(__dirname, 'scripts', 'coach-tts-worker.py');
    worker = spawn(
      uvBin,
      [
        'run',
        '--python',
        '3.13',
        '--with',
        'transformers',
        '--with',
        'torch',
        '--with',
        'scipy',
        '--with',
        'edge-tts',
        '--with',
        'certifi',
        '--with',
        'aiohttp',
        'python3',
        workerScript,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const rl = readline.createInterface({ input: worker.stdout });
    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line) as { id?: string; ok?: boolean; mime?: string; error?: string };
        if (msg.id && pending.has(msg.id)) {
          const entry = pending.get(msg.id)!;
          clearTimeout(entry.timer);
          pending.delete(msg.id);
          entry.resolve({ ok: Boolean(msg.ok), mime: msg.mime, error: msg.error });
        }
      } catch {
        /* ignore non-json stdout */
      }
    });

    worker.stdin.on('error', () => {
      /* ignore EPIPE when worker exits */
    });
    worker.on('error', () => {
      worker = null;
    });

    worker.on('exit', () => {
      worker = null;
      for (const [id, entry] of pending.entries()) {
        clearTimeout(entry.timer);
        pending.delete(id);
        entry.resolve({ ok: false, error: 'worker exited' });
      }
    });

    return worker;
  }

  return {
    name: 'multilingual-coach-tts',
    configureServer(server) {
      server.httpServer?.on('close', () => {
        if (worker && !worker.killed) worker.kill();
      });

      server.middlewares.use('/api/coach-tts', (req, res) => {
        const u = new URL(req.url ?? '', 'http://127.0.0.1');
        const voice = u.searchParams.get('voice') ?? 'en-US-ChristopherNeural';
        const lang = (u.searchParams.get('lang') ?? 'en').slice(0, 8);
        const text = (u.searchParams.get('text') ?? '').trim().slice(0, 520);

        if (!isValidVoice(voice) || !text) {
          res.statusCode = 400;
          res.end('Invalid voice or text');
          return;
        }

        const key = `${voice}|${lang}|${text}`;
        const hit = ttsMemCache.get(key);
        if (hit) {
          res.setHeader('Content-Type', hit.mime);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.end(hit.buf);
          return;
        }

        const ext = voice.startsWith('mms:') ? 'wav' : 'mp3';
        const id = `tts_${++seq}_${Date.now()}`;
        const tmpOut = path.join(os.tmpdir(), `soma_${id}.${ext}`);
        const proc = ensureWorker();

        const timer = setTimeout(() => {
          pending.delete(id);
          res.statusCode = 204;
          res.end();
        }, 12000);

        pending.set(id, {
          timer,
          resolve: (out) => {
            if (!out.ok || !fs.existsSync(tmpOut)) {
              res.statusCode = 204;
              res.end();
              return;
            }
            const buf = fs.readFileSync(tmpOut);
            fs.unlink(tmpOut, () => {});
            const mime = out.mime ?? (ext === 'wav' ? 'audio/wav' : 'audio/mpeg');
            if (ttsMemCache.size > 200) ttsMemCache.clear();
            ttsMemCache.set(key, { buf, mime });
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.end(buf);
          },
        });

        if (!proc.stdin.writable || proc.killed) {
          clearTimeout(timer);
          pending.delete(id);
          res.statusCode = 204;
          res.end();
          return;
        }
        try {
          proc.stdin.write(JSON.stringify({ id, voice, lang, text, out: tmpOut }) + '\n');
        } catch {
          clearTimeout(timer);
          pending.delete(id);
          res.statusCode = 204;
          res.end();
        }
      });
    },
  };
}

// Automatically sets `/<repo-name>/` when building in GitHub Actions for GitHub Pages,
// or accepts an explicit VITE_BASE_PATH, defaulting to `/` in dev and `./` in local builds.
const ghRepoName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH ?? (ghRepoName ? `/${ghRepoName}/` : command === 'build' ? './' : '/'),
  plugins: [
    coachTtsPlugin(),
    iwsdkDev({
      emulator: {
        device: 'metaQuest3',
        activation: 'localhost',
      },
      bundle: {
        fonts: ['inter'],
        icons: [],
      },
      https: false,
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
  },
}));
