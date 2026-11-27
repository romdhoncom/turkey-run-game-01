// Gobble Dash hand-in program: copies game/ and screenshots/ to /output and
// writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Runs under Node 22 with no flags, standard library only. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  let files = 0;
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    const st = statSync(from);
    if (st.isDirectory()) files += copyTree(from, to);
    else if (st.isFile()) { copyFileSync(from, to); files++; }
  }
  return files;
}

function main() {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('game/: no such directory in the repository');
  if (!existsSync(shotsDir)) throw new Error('screenshots/: no such directory in the repository');
  mkdirSync(outDir, { recursive: true });
  const gameFiles = copyTree(gameDir, join(outDir, 'game'));
  const shotFiles = copyTree(shotsDir, join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`Gobble Dash handed in: ${gameFiles} game files + ${shotFiles} screenshots copied, dossier.json written (${dossier.length} bytes).`);
}

main();
