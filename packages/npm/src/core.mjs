import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  readPackageJson,
  writePackageJson,
  getAssimilaiPackages,
  setAssimilaiPackage,
} from './json-io.mjs';

function sha256(filePath) {
  const data = readFileSync(filePath);
  return createHash('sha256').update(data).digest('hex');
}

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results.sort();
}

export function initAssimilation({ name, source, version, target, packageJsonPath }) {
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`target directory not found: ${target}`);
  }

  const data = readPackageJson(packageJsonPath);
  const filePaths = walkDir(target);

  if (filePaths.length === 0) {
    console.log(`warning: no files found in ${target}`);
    return;
  }

  const files = {};
  for (const fp of filePaths) {
    const rel = relative(target, fp);
    files[rel] = { status: 'verbatim', sha256: sha256(fp) };
  }

  const entry = {
    source,
    version,
    target,
    assimilated: new Date().toISOString().split('T')[0],
    files,
  };

  setAssimilaiPackage(data, name, entry);
  writePackageJson(packageJsonPath, data);
  console.log(`recorded ${Object.keys(files).length} files for '${name}' in ${packageJsonPath}`);
}

export function checkAssimilation({ name = null, packageJsonPath }) {
  const data = readPackageJson(packageJsonPath);
  const packages = getAssimilaiPackages(data);

  if (Object.keys(packages).length === 0) {
    console.log('no assimilai packages found');
    return true;
  }

  const entries = name ? { [name]: packages[name] } : packages;
  let allOk = true;

  for (const [pkgName, pkg] of Object.entries(entries)) {
    if (!pkg) {
      console.log(`error: package '${pkgName}' not found`);
      allOk = false;
      continue;
    }

    const target = pkg.target || '.';
    const files = pkg.files || {};
    console.log(`\nchecking '${pkgName}' (${Object.keys(files).length} files)`);

    for (const [filename, meta] of Object.entries(files)) {
      const status = meta.status || 'verbatim';

      if (status === 'adapted' || status === 'dissolved') {
        console.log(`  ${filename}: SKIP (${status})`);
        continue;
      }

      const filepath = join(target, filename);
      if (!existsSync(filepath)) {
        console.log(`  ${filename}: MISSING`);
        allOk = false;
        continue;
      }

      const expected = meta.sha256 || '';
      const actual = sha256(filepath);

      if (actual === expected) {
        console.log(`  ${filename}: OK`);
      } else {
        console.log(`  ${filename}: DRIFT`);
        allOk = false;
      }
    }
  }

  if (allOk) {
    console.log('\nall checks passed');
  } else {
    console.log('\ndrift detected');
  }

  return allOk;
}
