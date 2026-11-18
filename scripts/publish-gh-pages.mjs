import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const rootDir = resolve(process.cwd());
const distDir = join(rootDir, 'dist');
const worktreeDir = '/tmp/soma-xr-gh-pages-wt';

if (!existsSync(distDir)) {
  console.error('Error: dist/ directory does not exist. Run `vite build --base=/soma-xr/` first.');
  process.exit(1);
}

// Ensure .nojekyll exists in dist/ so GitHub Pages serves all assets untouched
writeFileSync(join(distDir, '.nojekyll'), '');

try {
  execFileSync('git', ['worktree', 'prune'], { cwd: rootDir, stdio: 'ignore' });
} catch {
  // ignore
}
rmSync(worktreeDir, { recursive: true, force: true });

execFileSync('git', ['worktree', 'add', '--detach', worktreeDir], {
  cwd: rootDir,
  stdio: 'inherit'
});

try {
  execFileSync('git', ['checkout', '--orphan', 'gh-pages-build'], {
    cwd: worktreeDir,
    stdio: 'inherit'
  });

  // Clear existing files in worktree except .git
  for (const entry of readdirSync(worktreeDir)) {
    if (entry === '.git') continue;
    rmSync(join(worktreeDir, entry), { recursive: true, force: true });
  }

  // Copy compiled dist/ files into worktree root
  for (const entry of readdirSync(distDir)) {
    cpSync(join(distDir, entry), join(worktreeDir, entry), { recursive: true });
  }

  execFileSync('git', ['add', '-A'], { cwd: worktreeDir, stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', 'Deploy Soma XR static bundle to gh-pages'], {
    cwd: worktreeDir,
    stdio: 'inherit'
  });
  execFileSync('git', ['branch', '-f', 'gh-pages', 'gh-pages-build'], {
    cwd: worktreeDir,
    stdio: 'inherit'
  });
} finally {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', worktreeDir], {
      cwd: rootDir,
      stdio: 'ignore'
    });
  } catch {
    rmSync(worktreeDir, { recursive: true, force: true });
  }
  try {
    execFileSync('git', ['branch', '-D', 'gh-pages-build'], {
      cwd: rootDir,
      stdio: 'ignore'
    });
  } catch {
    // ignore
  }
}

console.log('Prepared local `gh-pages` branch from ./dist. Run `git push -f -u origin gh-pages` to publish.');
