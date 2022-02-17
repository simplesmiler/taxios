#!/usr/bin/env node

import minimist from 'minimist';
import { maybe } from './utils';
import generate from './index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

async function main(): Promise<number> {
  // @SECTION: Args parse
  const args = process.argv.slice(2);
  type Argv = {
    out?: string;
    export?: string;
    'skip-validation': boolean;
    help: boolean;
    version: boolean;
    'named-enums': boolean;
    'union-enums': boolean;
    'skip-additional-properties': boolean;
    'keep-additional-properties': boolean;
    'sort-fields': boolean;
  };
  const argv = minimist<Argv>(args, {
    string: ['out', 'export'],
    boolean: [
      'skip-validation',
      'named-enums',
      'union-enums',
      'skip-additional-properties',
      'keep-additional-properties',
      'sort-fields',
      'help',
      'version',
    ],
    alias: {
      out: ['o'],
      export: ['e'],
      help: ['h'],
      version: ['v'],
    },
    default: {
      help: false,
      version: false,
      'skip-validate': false,
      'named-enums': false,
      'union-enums': false,
      'skip-additional-properties': false,
      'keep-additional-properties': false,
      'sort-fields': false,
    },
  });
  if (argv.help) {
    console.log(
      [
        `Version: ${pkg.version}`,
        'Example: taxios-generate -o PetStore.ts -e PetStore https://petstore.swagger.io/v2/swagger.json',
        '',
        'Usage: taxios-generate [options] <input-file-or-url>',
        'Options:',
        '  -h, --help                        Print this message',
        '  -o, --out FILE                    Write into this file',
        '  -e, --export NAME                 Export generated definition under this name',
        '      --skip-validation             Skip strict schema validation',
        '      --union-enums                 Generate union enums instead of named enums when possible',
        '      --keep-additional-properties  Generate`[k: string]: unknown` for objects, unless explicitly asked',
        '      --sort-fields                 Sort fields in interfaces instead of keeping the order from source',
        '  -v, --version                     Print version',
      ].join('\n'),
    );
    return 0;
  }
  if (argv.version) {
    console.log(pkg.version);
    return 0;
  }
  //
  const exportName = argv.export;
  const inputPath = maybe(argv._[0]);
  const outputPath = argv.out;
  const validate = !argv['skip-validation'];
  const shouldSortFields = argv['sort-fields'];

  const namedEnums = !argv['union-enums'];
  if (argv['named-enums']) {
    console.warn(
      'Warning: You are using deprecated option --named-enums, which is now the default behavior. You can safely remove this option.',
    );
  }

  const skipAdditionalProperties = !argv['keep-additional-properties'];
  if (argv['skip-additional-properties']) {
    console.warn(
      'Warning: You are using deprecated option --skip-additional-properties, which is now the default behavior. You can safely remove this option.',
    );
  }

  //
  if (!inputPath || argv._.length > 1) {
    console.error('You have to specify a single input file or url');
    return 1;
  }
  if (!outputPath) {
    console.error('You have to specify --out FILE');
    return 1;
  }
  if (!exportName) {
    console.error('You have to specify --export NAME`');
    return 1;
  }

  //
  await generate({
    exportName,
    input: inputPath,
    outputPath,
    skipValidate: !validate,
    sortFields: shouldSortFields,
    unionEnums: !namedEnums,
    keepAdditionalProperties: !skipAdditionalProperties,
  });

  //
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    if (Object.prototype.hasOwnProperty.call(err, 'toJSON')) {
      console.error(err.message, err.stack);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
