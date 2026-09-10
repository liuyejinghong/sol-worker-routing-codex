import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'jsonc-parser';
export async function profileFixture(root: string) {
  const data = parse(await fs.readFile(path.resolve('config/omo-profile.jsonc'), 'utf8'));
  const file = path.join(root, '.omo/omo.json');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
  return file;
}
