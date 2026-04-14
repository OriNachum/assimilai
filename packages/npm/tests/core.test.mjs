import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SCHEMA_VERSION,
  addCitation,
  checkCitations,
  migrateManifest,
} from '../src/core.mjs';

function setupWorkspace() {
  const root = mkdtempSync(join(tmpdir(), 'citation-cli-test-'));
  const packageJsonPath = join(root, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify({ name: 'test-project' }, null, 2));

  const target = join(root, 'target');
  mkdirSync(target);
  writeFileSync(join(target, 'transport.js'), '// transport module\n');
  writeFileSync(join(target, 'config.js'), '// config module\n');

  return { root, packageJsonPath, target };
}

describe('addCitation', () => {
  it('creates citation section with schema v2 in package.json', () => {
    const { packageJsonPath, target } = setupWorkspace();

    addCitation({
      name: 'my-pkg',
      source: '../packages/ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    assert.ok(data.citation);
    assert.ok(data.citation.packages['my-pkg']);

    const pkg = data.citation.packages['my-pkg'];
    assert.equal(pkg.schema, SCHEMA_VERSION);
    assert.equal(pkg.source, '../packages/ref');
    assert.equal(pkg.version, '1.0.0');
    assert.ok(pkg.cited);
    assert.ok(pkg.files['transport.js']);
    assert.equal(pkg.files['transport.js'].status, 'quote');
    assert.ok(pkg.files['transport.js'].sha256);
  });

  it('throws on missing target directory', () => {
    const { packageJsonPath } = setupWorkspace();
    assert.throws(
      () => addCitation({
        name: 'x',
        source: '.',
        version: '1.0.0',
        target: '/nonexistent/path',
        packageJsonPath,
      }),
      /target directory not found/
    );
  });
});

describe('checkCitations', () => {
  it('returns true when all files match', () => {
    const { packageJsonPath, target } = setupWorkspace();

    addCitation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    const ok = checkCitations({ packageJsonPath });
    assert.equal(ok, true);
  });

  it('detects drift when file is modified', () => {
    const { packageJsonPath, target } = setupWorkspace();

    addCitation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    writeFileSync(join(target, 'transport.js'), '// modified!\n');
    const ok = checkCitations({ packageJsonPath });
    assert.equal(ok, false);
  });

  it('detects missing files', () => {
    const { packageJsonPath, target } = setupWorkspace();

    addCitation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    unlinkSync(join(target, 'config.js'));
    const ok = checkCitations({ packageJsonPath });
    assert.equal(ok, false);
  });

  it('skips paraphrased files', () => {
    const { packageJsonPath, target } = setupWorkspace();

    addCitation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    data.citation.packages['my-pkg'].files['config.js'] = { status: 'paraphrase' };
    writeFileSync(packageJsonPath, JSON.stringify(data, null, 2));

    writeFileSync(join(target, 'config.js'), '// completely changed\n');
    const ok = checkCitations({ packageJsonPath });
    assert.equal(ok, true);
  });

  it('skips synthesized files', () => {
    const { packageJsonPath, target } = setupWorkspace();

    addCitation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    data.citation.packages['my-pkg'].files['config.js'] = {
      status: 'synthesize',
      into: 'app/settings.js',
    };
    writeFileSync(packageJsonPath, JSON.stringify(data, null, 2));

    unlinkSync(join(target, 'config.js'));
    const ok = checkCitations({ packageJsonPath });
    assert.equal(ok, true);
  });
});

describe('migrateManifest', () => {
  function writeLegacy(packageJsonPath) {
    const legacy = {
      name: 'test-project',
      assimilai: {
        packages: {
          harness: {
            source: '../ref',
            version: '0.6.0',
            target: 'vendor/harness',
            assimilated: '2026-03-24',
            files: {
              'transport.js': { status: 'verbatim', sha256: 'abc' },
              'adapter.js': { status: 'adapted' },
              'config.js': { status: 'dissolved', into: 'app/settings.js' },
            },
          },
        },
      },
    };
    writeFileSync(packageJsonPath, JSON.stringify(legacy, null, 2));
  }

  it('translates v1 to v2', () => {
    const { packageJsonPath } = setupWorkspace();
    writeLegacy(packageJsonPath);

    const translated = migrateManifest({ packageJsonPath });
    assert.equal(translated, 3);

    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    assert.equal(data.assimilai, undefined);
    const pkg = data.citation.packages.harness;
    assert.equal(pkg.schema, SCHEMA_VERSION);
    assert.equal(pkg.cited, '2026-03-24');
    assert.equal(pkg.files['transport.js'].status, 'quote');
    assert.equal(pkg.files['adapter.js'].status, 'paraphrase');
    assert.equal(pkg.files['config.js'].status, 'synthesize');
    assert.equal(pkg.files['config.js'].into, 'app/settings.js');
  });

  it('dry-run leaves file unchanged', () => {
    const { packageJsonPath } = setupWorkspace();
    writeLegacy(packageJsonPath);
    const original = readFileSync(packageJsonPath, 'utf8');

    const translated = migrateManifest({ packageJsonPath, dryRun: true });
    assert.equal(translated, 3);
    assert.equal(readFileSync(packageJsonPath, 'utf8'), original);
  });

  it('refuses if citation already exists', () => {
    const { packageJsonPath } = setupWorkspace();
    writeFileSync(
      packageJsonPath,
      JSON.stringify({ name: 'x', citation: { placeholder: true } }, null, 2)
    );
    assert.throws(() => migrateManifest({ packageJsonPath }), /already exists/);
  });

  it('refuses if no assimilai block', () => {
    const { packageJsonPath } = setupWorkspace();
    assert.throws(() => migrateManifest({ packageJsonPath }), /nothing to migrate/);
  });

  it('rejects unknown status', () => {
    const { packageJsonPath } = setupWorkspace();
    writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: 'x',
          assimilai: {
            packages: {
              h: { files: { 'a.js': { status: 'sublimated' } } },
            },
          },
        },
        null,
        2
      )
    );
    assert.throws(() => migrateManifest({ packageJsonPath }), /unknown status/);
  });

  it('preserves schema v2 even when legacy entry has a schema key', () => {
    const { packageJsonPath } = setupWorkspace();
    writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: 'test-project',
          assimilai: {
            packages: {
              harness: {
                schema: 1,
                source: '../ref',
                version: '0.6.0',
                target: 'vendor/harness',
                assimilated: '2026-03-24',
                files: {
                  'transport.js': { status: 'verbatim', sha256: 'abc' },
                },
              },
            },
          },
        },
        null,
        2
      )
    );

    migrateManifest({ packageJsonPath });

    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const pkg = data.citation.packages.harness;
    assert.equal(pkg.schema, SCHEMA_VERSION);
    assert.equal(pkg.source, '../ref');
    assert.equal(pkg.files['transport.js'].status, 'quote');
  });
});
