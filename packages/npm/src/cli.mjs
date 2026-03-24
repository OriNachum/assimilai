import { initAssimilation, checkAssimilation } from './core.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

function printHelp() {
  console.log(`assimilai ${pkg.version}

Usage:
  assimilai init <name> --source <path> --version <ver> --target <dir>
  assimilai check [name]
  assimilai --help | --version

Commands:
  init    Record an assimilation in package.json
  check   Verify assimilated file integrity

Options:
  --package-json <path>  Path to package.json (default: package.json)
  --help                 Show this help
  --version              Show version`);
}

function parseArgs(argv) {
  const args = { flags: {}, positional: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.flags.help = true;
    } else if (arg === '--version') {
      args.flags.version = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      args.flags[key] = argv[++i] || '';
    } else {
      args.positional.push(arg);
    }
    i++;
  }
  return args;
}

export function run(argv) {
  const { flags, positional } = parseArgs(argv);

  if (flags.help) {
    printHelp();
    return;
  }
  if (flags.version) {
    console.log(`assimilai ${pkg.version}`);
    return;
  }

  const command = positional[0];
  const packageJsonPath = flags['package-json'] || 'package.json';

  if (command === 'init') {
    const name = positional[1];
    if (!name || !flags.source || !flags.version || !flags.target) {
      console.error('Usage: assimilai init <name> --source <path> --version <ver> --target <dir>');
      process.exit(1);
    }
    initAssimilation({
      name,
      source: flags.source,
      version: flags.version,
      target: flags.target,
      packageJsonPath,
    });
  } else if (command === 'check') {
    const name = positional[1] || null;
    const ok = checkAssimilation({ name, packageJsonPath });
    if (!ok) process.exit(1);
  } else {
    printHelp();
    process.exit(1);
  }
}
