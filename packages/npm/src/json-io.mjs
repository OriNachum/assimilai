import { readFileSync, writeFileSync } from 'node:fs';

export function readPackageJson(path) {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

export function writePackageJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function getAssimilaiPackages(data) {
  return data?.assimilai?.packages || {};
}

export function setAssimilaiPackage(data, name, entry) {
  if (!data.assimilai) data.assimilai = {};
  if (!data.assimilai.packages) data.assimilai.packages = {};
  data.assimilai.packages[name] = entry;
  return data;
}
