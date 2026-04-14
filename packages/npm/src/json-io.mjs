import { readFileSync, writeFileSync } from 'node:fs';

export function readPackageJson(path) {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

export function writePackageJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function getCitationPackages(data) {
  return data?.citation?.packages || {};
}

export function setCitationPackage(data, name, entry) {
  if (!data.citation) data.citation = {};
  if (!data.citation.packages) data.citation.packages = {};
  data.citation.packages[name] = entry;
  return data;
}
