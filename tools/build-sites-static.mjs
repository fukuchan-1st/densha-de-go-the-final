import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const source = join(root, 'dist');
const buildDirectory = join(root, '.output');
mkdirSync(buildDirectory, {recursive: true});
const output = join(buildDirectory, 'public');

const existing = existsSync(output) ? realpathSync(output) : resolve(realpathSync(buildDirectory), 'public');
const outputPath = relative(root, existing);
if (isAbsolute(outputPath) || outputPath !== '.output' + sep + 'public') {
 throw new Error('The Sites build directory must stay inside the project');
}
rmSync(output, {force: true, recursive: true});
mkdirSync(output, {recursive: true});
cpSync(source, output, {recursive: true});

// Preserve the JSON byte for byte. The game accepts both plain and gzip assets.
const data = join(output, 'assets', 'final');
for (const name of readdirSync(data)) {
 if (!name.endsWith('-route.json') && !['vehicle-recipes.json', 'tobu118-bve2-profile.json'].includes(name)) continue;
 const file = join(data, name);
 const bytes = readFileSync(file);
 if (bytes.length >= 75000) writeFileSync(file, gzipSync(bytes, {level: 9}));
}
