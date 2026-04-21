import { addCitation, checkCitations, migrateManifest } from './core.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

function printHelp() {
  console.log(`cite ${pkg.version}

Usage:
  cite add <name> --source <path> --version <ver> --target <dir>
  cite check [name]
  cite migrate [--dry-run]
  cite sync [name]
  cite --help | --version

Commands:
  add       Record a citation in package.json
  check     Verify quoted file integrity
  migrate   Migrate a legacy "assimilai" manifest to "citation" v2
  sync      Update quoted files from source (not yet implemented)

Options:
  --package-json <path>  Path to package.json (default: package.json)
  --dry-run              (migrate) show translation without writing
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
    } else if (arg === '--version' && args.positional.length === 0) {
      args.flags.cliVersion = true;
    } else if (arg === '--dry-run') {
      args.flags['dry-run'] = true;
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
  if (flags.cliVersion) {
    console.log(`cite ${pkg.version}`);
    return;
  }

  const command = positional[0];
  const packageJsonPath = flags['package-json'] || 'package.json';

  if (command === 'add') {
    const name = positional[1];
    if (!name || !flags.source || !flags.version || !flags.target) {
      console.error('Usage: cite add <name> --source <path> --version <ver> --target <dir>');
      process.exit(1);
    }
    addCitation({
      name,
      source: flags.source,
      version: flags.version,
      target: flags.target,
      packageJsonPath,
    });
  } else if (command === 'check') {
    const name = positional[1] || null;
    const ok = checkCitations({ name, packageJsonPath });
    if (!ok) process.exit(1);
  } else if (command === 'migrate') {
    try {
      migrateManifest({ packageJsonPath, dryRun: !!flags['dry-run'] });
    } catch (err) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'sync') {
    console.log(
      'cite sync: not yet implemented. Scheduled for 0.2.0.\n' +
        'See https://culture.dev/citation-cli/spec/#propagation for the ' +
        'propagation rules the command will follow.'
    );
    process.exit(2);
  } else {
    printHelp();
    process.exit(1);
  }
}
