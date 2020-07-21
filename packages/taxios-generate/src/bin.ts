#!/usr/bin/env node

import { promises as outerFs } from 'fs';
import nodePath from 'path';
import { OptionalKind, Project, PropertySignatureStructure, Writers } from 'ts-morph';
import { cloneDeep } from 'lodash';
import { compile } from 'json-schema-to-typescript';
import { JSONSchema4 } from 'json-schema';
import traverse from 'json-schema-traverse';
import mkdirp from 'mkdirp';
import minimist from 'minimist';

const pkg = require('../package.json');

import { eraseRefObject, maybe, openApiMethods, parseToOpenApi, resolveRef, resolveRefArray } from './utils';

function replaceRefsWithTsTypes(tree: JSONSchema4, prefix: string, rootNamespaceName: string): void {
  traverse(tree, (node: JSONSchema4) => {
    if (node.$ref) {
      const ref = node.$ref;
      delete node.$ref;
      node.tsType = ref.slice(prefix.length);
      const nameWithOpenApiNamespace = ref.slice(prefix.length);
      const nameParts = nameWithOpenApiNamespace.split('.');
      if (nameParts[0] !== rootNamespaceName) {
        nameParts.unshift(rootNamespaceName);
      }
      node.tsType = nameParts.join('.');
    }
  });
}

// @TODO: Cover with tests
async function schemaToRawTsType(project: Project, schema: JSONSchema4, rootNamespaceName: string): Promise<string> {
  // @NOTE: Wrap schema in object to force generator to produce type instead of interface
  const wrappedSchema = { type: 'object', properties: { target: cloneDeep(schema) } } as JSONSchema4;
  replaceRefsWithTsTypes(wrappedSchema, '#/components/schemas/', rootNamespaceName);

  const rawSchemaInterface = await compile(wrappedSchema, 'Temp', { bannerComment: '' });

  // @TODO: Use some different way to generate typescript types from json schema,
  //        because using temporary files is meh
  const tempFile = project.createSourceFile('temp.ts', rawSchemaInterface);
  const tsInterface = tempFile.getInterfaceOrThrow('Temp');
  const typeNode = tsInterface.getProperties()[0].getTypeNode();
  if (!typeNode) {
    throw new Error('Unexpected situation, did not find type node');
  }
  const tsType = typeNode.getText();
  project.removeSourceFile(tempFile);
  return tsType;
}

async function main(): Promise<number> {
  // @SECTION:
  const args = process.argv.slice(2);
  type Argv = {
    out?: string;
    export?: string;
    'skip-validation': boolean;
    help: boolean;
    version: boolean;
  };
  const argv = minimist<Argv>(args, {
    string: ['out', 'export'],
    boolean: ['skip-validation', 'help', 'version'],
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
        '  -h, --help               Print this message',
        '  -o, --out FILE           Write into this file',
        '  -e, --export NAME        Export generated definition under this name',
        '      --skip-validation    Skip strict schema validation',
        '  -v, --version            Print version',
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
  // @SECTION: Setup
  const [openApiParser, openApiDocument] = await parseToOpenApi(inputPath, { validate });
  //
  const project = new Project({ useInMemoryFileSystem: true });
  const generatedFile = project.createSourceFile(`generated.ts`);
  const rootNamespace = generatedFile.addNamespace({ name: exportName, isExported: true });
  //
  // @SECTION: Schemas
  const components = openApiDocument.components;
  if (components) {
    const schemas = eraseRefObject(components.schemas);
    if (schemas) {
      for (const [nameWithOpenApiNamespace, schema] of Object.entries(schemas)) {
        const nameParts = nameWithOpenApiNamespace.split('.');
        const namespaceNames = nameParts.slice(0, -1);
        if (namespaceNames.length > 0 && namespaceNames[0] === exportName) {
          namespaceNames.splice(0, 1);
        }
        const name = nameParts[nameParts.length - 1];

        let targetNamespace = rootNamespace;
        for (const namespaceName of namespaceNames) {
          const childNamespace = targetNamespace.getNamespace(namespaceName);
          if (childNamespace) targetNamespace = childNamespace;
          else targetNamespace = targetNamespace.addNamespace({ name: namespaceName, isExported: true });
        }

        const jsonSchema = cloneDeep(schema) as JSONSchema4;
        replaceRefsWithTsTypes(jsonSchema, '#/components/schemas/', exportName);
        const rawSchemaInterface = await compile(jsonSchema, name, { bannerComment: '' });
        targetNamespace.addStatements((writer) => {
          writer.write(rawSchemaInterface);
        });
      }
    }
  }
  //
  // @SECTION: Routes
  const apiInterface = generatedFile.addInterface({
    name: exportName,
    isExported: true,
    properties: [
      {
        name: 'version',
        type: "'1'",
      },
    ],
  });
  apiInterface.addProperty({
    name: 'routes', // NOTE: E.g. PetStore.Api['routes']
    type: Writers.objectType({
      properties: await Promise.all(
        Object.entries(openApiDocument.paths).map(async ([route, pathItem]) => {
          const commonParameters = resolveRefArray(openApiParser, pathItem.parameters) || []; // @NOTE: Url fragment params
          return {
            name: JSON.stringify(route), // @NOTE: E.g. PetStore.Api['routes']['/users/{id}']
            type: Writers.objectType({
              properties: await Promise.all(
                openApiMethods
                  .filter((method) => Object.prototype.hasOwnProperty.call(pathItem, method))
                  .map(async (method) => {
                    const operationProperties: OptionalKind<PropertySignatureStructure>[] = [];
                    const operation = pathItem[method]!; // @ASSERT: Checked by filter above
                    const requestBody = resolveRef(openApiParser, operation.requestBody);
                    if (requestBody) {
                      const required = requestBody.required;
                      // @TODO: This is flaky, what if request body has multiple media types?
                      const formDataMediaType = maybe(
                        requestBody.content['multipart/form-data'] ||
                          requestBody.content['application/x-www-form-urlencoded'],
                      );
                      const jsonMediaType = maybe(requestBody.content['application/json']);
                      if (formDataMediaType) {
                        // @NOTE: Form data currently can not be typed further, so we ignore everything else
                        operationProperties.push({ name: 'body', type: 'FormData', hasQuestionToken: !required });
                      } else if (jsonMediaType) {
                        const schema = jsonMediaType.schema;
                        if (!schema) {
                          throw new Error(`Unexpected situation, schema for request body of ${route} is missing`);
                        }
                        const rawTsType = await schemaToRawTsType(project, schema, exportName);
                        operationProperties.push({ name: 'body', type: rawTsType, hasQuestionToken: !required });
                      } else {
                        throw new Error(`Unexpected situation, unknown media type for request body of ${route}`);
                      }
                    }
                    //
                    const localParameters = resolveRefArray(openApiParser, operation.parameters) || []; // @NOTE: Url fragment params
                    const parameters = commonParameters.concat(localParameters);
                    const pathParameters = parameters.filter((parameter) => parameter.in === 'path');
                    if (pathParameters.length > 0) {
                      const paramProperties: OptionalKind<PropertySignatureStructure>[] = [];
                      for (const parameter of pathParameters) {
                        const schema = parameter.schema;
                        if (!schema) {
                          throw new Error(
                            `Unexpected situation, schema for parameter ${parameter.name} of ${route} is missing`,
                          );
                        }
                        const rawTsType = await schemaToRawTsType(project, schema, exportName);
                        paramProperties.push({
                          name: parameter.name,
                          type: rawTsType,
                          hasQuestionToken: !parameter.required,
                        });
                      }
                      operationProperties.push({
                        name: 'params',
                        type: Writers.objectType({ properties: paramProperties }),
                        hasQuestionToken: pathParameters.every((parameter) => !parameter.required),
                      });
                    }
                    //
                    const queryParameters = parameters.filter((parameter) => parameter.in === 'query');
                    if (queryParameters.length > 0) {
                      const paramProperties: OptionalKind<PropertySignatureStructure>[] = [];
                      for (const parameter of queryParameters) {
                        const schema = parameter.schema;
                        if (!schema) {
                          throw new Error(
                            `Unexpected situation, schema for parameter ${parameter.name} of ${route} is missing`,
                          );
                        }
                        const rawTsType = await schemaToRawTsType(project, schema, exportName);
                        paramProperties.push({
                          name: parameter.name,
                          type: rawTsType,
                          hasQuestionToken: !parameter.required,
                        });
                      }
                      operationProperties.push({
                        name: 'query',
                        type: Writers.objectType({ properties: paramProperties }),
                        hasQuestionToken: queryParameters.every((parameter) => !parameter.required),
                      });
                    }
                    //
                    // @TODO: Other parameters (like headers)?
                    //
                    const responses = operation.responses;
                    if (responses) {
                      const http200 = resolveRef(openApiParser, responses['200']); // @NOTE: OpenAPI types are wrong about this index type
                      if (http200) {
                        const mediaTypeObject = http200.content;
                        if (mediaTypeObject) {
                          // @TODO: This is flaky, what if request body has multiple media types?
                          const jsonMediaType = maybe(mediaTypeObject['application/json']);
                          if (jsonMediaType) {
                            const schema = jsonMediaType.schema;
                            if (!schema) {
                              throw new Error(`Unexpected situation, schema for response body of ${route} is missing`);
                            }
                            const rawTsType = await schemaToRawTsType(project, schema, exportName);
                            operationProperties.push({ name: 'response', type: rawTsType, hasQuestionToken: false });
                          } else {
                            throw new Error(`Unexpected situation, unknown media type for response body of ${route}`);
                          }
                        }
                      }
                    }
                    return {
                      name: method.toUpperCase(), // @NOTE: E.g. PetStore.Api['routes']['/users/{id}']['POST']
                      type: Writers.objectType({ properties: operationProperties }),
                    };
                  }),
              ),
            }),
          };
        }),
      ),
    }),
  });
  //
  // @TODO: Programmatic prettier (can be hard to befriend with TypeScript files)
  generatedFile.formatText();
  await generatedFile.save();
  const generatedCodeString = generatedFile.getFullText();
  await mkdirp(nodePath.dirname(outputPath));
  await outerFs.writeFile(outputPath, generatedCodeString);
  //
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
