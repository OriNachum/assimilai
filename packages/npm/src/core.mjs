import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  readPackageJson,
  writePackageJson,
  getCitationPackages,
  setCitationPackage,
} from './json-io.mjs';

export const SCHEMA_VERSION = 2;

export const LEGACY_STATUS_MAP = {
  verbatim: 'quote',
  adapted: 'paraphrase',
  dissolved: 'synthesize',
};
export const VALID_STATUSES = new Set(['quote', 'paraphrase', 'synthesize']);
const SKIP_STATUSES = new Set(['paraphrase', 'synthesize']);

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

export function addCitation({ name, source, version, target, packageJsonPath }) {
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
    files[rel] = { status: 'quote', sha256: sha256(fp) };
  }

  const entry = {
    schema: SCHEMA_VERSION,
    source,
    version,
    target,
    cited: new Date().toISOString().split('T')[0],
    files,
  };

  setCitationPackage(data, name, entry);
  writePackageJson(packageJsonPath, data);
  console.log(`recorded ${Object.keys(files).length} files for '${name}' in ${packageJsonPath}`);
}

export function checkCitations({ name = null, packageJsonPath }) {
  const data = readPackageJson(packageJsonPath);
  const packages = getCitationPackages(data);

  if (Object.keys(packages).length === 0) {
    console.log('no citations found');
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
      const status = meta.status || 'quote';

      if (SKIP_STATUSES.has(status)) {
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

export function migrateManifest({ packageJsonPath = 'package.json', dryRun = false } = {}) {
  const data = readPackageJson(packageJsonPath);

  if (data.citation) {
    throw new Error(
      `"citation" key already exists in ${packageJsonPath} — refusing to overwrite`
    );
  }
  if (!data.assimilai) {
    throw new Error(
      `no "assimilai" key found in ${packageJsonPath} — nothing to migrate`
    );
  }

  const legacyPackages = data.assimilai.packages || {};
  let translatedFiles = 0;
  const newPackages = {};

  for (const [pkgName, pkg] of Object.entries(legacyPackages)) {
    const newPkg = { schema: SCHEMA_VERSION };
    for (const [key, value] of Object.entries(pkg)) {
      if (key === 'files') continue;
      if (key === 'assimilated') newPkg.cited = value;
      else newPkg[key] = value;
    }

    const newFiles = {};
    for (const [filename, meta] of Object.entries(pkg.files || {})) {
      const status = meta.status || 'verbatim';
      let newStatus;
      if (status in LEGACY_STATUS_MAP) {
        newStatus = LEGACY_STATUS_MAP[status];
        translatedFiles += 1;
      } else if (VALID_STATUSES.has(status)) {
        newStatus = status;
      } else {
        throw new Error(
          `unknown status '${status}' for file '${filename}' in package '${pkgName}'`
        );
      }
      newFiles[filename] = { ...meta, status: newStatus };
    }
    newPkg.files = newFiles;
    newPackages[pkgName] = newPkg;
  }

  if (dryRun) {
    console.log(
      `dry-run: would translate ${Object.keys(newPackages).length} package(s) ` +
        `and ${translatedFiles} file status(es)`
    );
    return translatedFiles;
  }

  data.citation = { packages: newPackages };
  delete data.assimilai;
  writePackageJson(packageJsonPath, data);
  console.log(
    `migrated ${Object.keys(newPackages).length} package(s) ` +
      `and ${translatedFiles} file status(es) to schema v${SCHEMA_VERSION}`
  );
  return translatedFiles;
}
