import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { initAssimilation, checkAssimilation } from '../src/core.mjs';

function setupWorkspace() {
  const root = mkdtempSync(join(tmpdir(), 'assimilai-test-'));
  const packageJsonPath = join(root, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify({ name: 'test-project' }, null, 2));

  const target = join(root, 'target');
  mkdirSync(target);
  writeFileSync(join(target, 'transport.js'), '// transport module\n');
  writeFileSync(join(target, 'config.js'), '// config module\n');

  return { root, packageJsonPath, target };
}

describe('initAssimilation', () => {
  it('creates assimilai section in package.json', () => {
    const { packageJsonPath, target } = setupWorkspace();

    initAssimilation({
      name: 'my-pkg',
      source: '../packages/ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    assert.ok(data.assimilai);
    assert.ok(data.assimilai.packages['my-pkg']);

    const pkg = data.assimilai.packages['my-pkg'];
    assert.equal(pkg.source, '../packages/ref');
    assert.equal(pkg.version, '1.0.0');
    assert.ok(pkg.files['transport.js']);
    assert.equal(pkg.files['transport.js'].status, 'verbatim');
    assert.ok(pkg.files['transport.js'].sha256);
  });

  it('throws on missing target directory', () => {
    const { packageJsonPath } = setupWorkspace();
    assert.throws(
      () => initAssimilation({
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

describe('checkAssimilation', () => {
  it('returns true when all files match', () => {
    const { packageJsonPath, target } = setupWorkspace();

    initAssimilation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    const ok = checkAssimilation({ packageJsonPath });
    assert.equal(ok, true);
  });

  it('detects drift when file is modified', () => {
    const { packageJsonPath, target } = setupWorkspace();

    initAssimilation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    writeFileSync(join(target, 'transport.js'), '// modified!\n');
    const ok = checkAssimilation({ packageJsonPath });
    assert.equal(ok, false);
  });

  it('detects missing files', () => {
    const { packageJsonPath, target } = setupWorkspace();

    initAssimilation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    unlinkSync(join(target, 'config.js'));
    const ok = checkAssimilation({ packageJsonPath });
    assert.equal(ok, false);
  });

  it('skips adapted files', () => {
    const { packageJsonPath, target } = setupWorkspace();

    initAssimilation({
      name: 'my-pkg',
      source: '../ref',
      version: '1.0.0',
      target,
      packageJsonPath,
    });

    // Manually mark config.js as adapted
    const data = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    data.assimilai.packages['my-pkg'].files['config.js'] = { status: 'adapted' };
    writeFileSync(packageJsonPath, JSON.stringify(data, null, 2));

    // Modify the adapted file — should not cause drift
    writeFileSync(join(target, 'config.js'), '// completely changed\n');
    const ok = checkAssimilation({ packageJsonPath });
    assert.equal(ok, true);
  });
});
