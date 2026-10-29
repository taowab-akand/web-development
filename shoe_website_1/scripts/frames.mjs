import {copyFile, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';

const source = new URL('../shoe frames/', import.meta.url);
const destination = new URL('../public/shoe frames/', import.meta.url);
const manifestURL = new URL('../src/shoeFrames.json', import.meta.url);
const frameNumber = name => Number(name.match(/^frame_(\d+)\.webp$/)[1]);

// Keep the uploaded folder authoritative. The public directory is derived output.
export async function prepareFrames() {
  const files = (await readdir(source))
    .filter(name => /^frame_\d+\.webp$/.test(name))
    .sort((a, b) => frameNumber(a) - frameNumber(b));
  if (!files.length) throw new Error('No uploaded frames found in shoe frames.');
  for (const file of files) {
    const bytes = await readFile(new URL(file, source));
    if (bytes.length <= 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
      throw new Error(`Invalid WebP frame: shoe frames/${file}`);
    }
  }
  const numbers = new Set(files.map(frameNumber));
  const lastFrame = frameNumber(files.at(-1));
  const missingNumbers = Array.from({length: lastFrame}, (_, index) => index + 1)
    .filter(number => !numbers.has(number));
  const manifest = JSON.stringify({source: 'shoe frames', files, missingNumbers}, null, 2) + '\n';
  const existing = await readFile(manifestURL, 'utf8').catch(() => '');
  if (existing !== manifest) await writeFile(manifestURL, manifest);
  await rm(destination, {recursive: true, force: true});
  await mkdir(destination, {recursive: true});
  await Promise.all(files.map(file => copyFile(new URL(file, source), new URL(file, destination))));
  return {count: files.length, missingNumbers};
}
