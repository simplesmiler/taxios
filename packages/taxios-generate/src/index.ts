import {
  Document,
  eraseRefObject,
  maybe,
  OpenApiDocument,
  openApiMethods,
  parseToOpenApi,
  resolveRef,
  resolveRefArray,
} from './utils';
import { ModuleDeclarationKind, OptionalKind, Project, PropertySignatureStructure, Writers } from 'ts-morph';
import { cloneDeep, sortBy } from 'lodash';
import { JSONSchema4, JSONSchema4Type } from 'json-schema';
import mkdirp from 'mkdirp';
import nodePath from 'path';
import { promises as outerFs } from 'fs';
import { compile } from 'json-schema-to-typescript';
import { toSafeString } from 'json-schema-to-typescript/dist/src/utils';
import traverse from 'json-schema-traverse';
import { openapiSchemaToJsonSchema } from '@openapi-contrib/openapi-schema-to-json-schema';

function replaceRefsWithTsTypes(tree: JSONSchema4, prefix: string, rootNamespaceName: string): void {
  traverse(tree, (node: JSONSchema4) => {
    if (node.$ref) {
      const ref = node.$ref;
      delete node.$ref;
      const nameWithOpenApiNamespace = ref.slice(prefix.length);
      const nameParts = nameWithOpenApiNamespace
        .split('.')
        .map((part) => (isValidJsIdentifier(part) ? part : toSafeString(part)));
      if (nameParts[0] !== rootNamespaceName) {
        nameParts.unshift(rootNamespaceName);
      }
      node.tsType = nameParts.join('.');
    }
  });
}

function sortFields(tree: JSONSchema4): void {
  traverse(tree, (node: JSONSchema4) => {
    if (node.type === 'object' && node.properties) {
      const sortedProperties = {};
      const keys = sortBy(Object.keys(node.properties));
      for (const key of keys) {
        sortedProperties[key] = node.properties[key];
      }
      node.properties = sortedProperties;
    }
  });
}

function placeExplicitAdditionalProperties(tree: JSONSchema4, defaultValue: boolean): void {
  traverse(tree, (node: JSONSchema4) => {
    if (node.type === 'object' && !Object.prototype.hasOwnProperty.call(node, 'additionalProperties')) {
      node.additionalProperties = defaultValue;
    }
  });
}

// @DOC: The library generates titled inline types as standalone interfaces which we do not want.
// @REFERENCE: https://github.com/bcherny/json-schema-to-typescript/issues/269
// @REFERENCE: https://github.com/bcherny/json-schema-to-typescript/issues/181
// @TODO: Maybe generate nested namespaces for titled inline types?
function trimTypeTitles(tree: JSONSchema4): void {
  traverse(tree, (node: JSONSchema4) => {
    if (Object.prototype.hasOwnProperty.call(node, 'title')) {
      delete node.title;
    }
  });
}

// @TODO: Cover with tests
async function schemaToTsTypeExpression(
  document: OpenApiDocument,
  project: Project,
  schema: JSONSchema4,
  rootNamespaceName: string,
  skipAdditionalProperties: boolean,
  shouldSortFields: boolean,
  ignoreMinMaxItems: boolean,
): Promise<string> {
  // @NOTE: Wrap schema in object to force generator to produce type instead of interface
  let wrappedSchema = { type: 'object', properties: { target: cloneDeep(schema) } } as JSONSchema4;
  replaceRefsWithTsTypes(wrappedSchema, '#/components/schemas/', rootNamespaceName);
  trimTypeTitles(wrappedSchema);
  if (skipAdditionalProperties) {
    placeExplicitAdditionalProperties(wrappedSchema, false);
  }
  if (shouldSortFields) {
    sortFields(wrappedSchema);
  }
  if (document.openapi.startsWith('3.0.')) {
    wrappedSchema = openapiSchemaToJsonSchema(wrappedSchema);
  }

  const rawTsWrappedInterface = await compile(wrappedSchema, 'Temp', {
    bannerComment: '',
    ignoreMinAndMaxItems: ignoreMinMaxItems,
  });

  // @TODO: Use some different way to generate typescript types from json schema,
  //        because using temporary files is meh
  const tempFile = project.createSourceFile('temp.ts', rawTsWrappedInterface);
  const tsInterface = tempFile.getInterfaceOrThrow('Temp');
  const typeNode = tsInterface.getProperties()[0].getTypeNode();
  if (!typeNode) {
    throw new Error('Unexpected situation, did not find type node');
  }
  const tsTypeExpression = typeNode.getText();
  project.removeSourceFile(tempFile);
  return tsTypeExpression;
}

const VALID_IDENTIFIER_REGEX = /^[$_\p{L}][$_\p{L}\p{N}]*$/u;
function isValidJsIdentifier(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  return VALID_IDENTIFIER_REGEX.test(name);
}

function parseEnumNameCandidates(
  path: string,
  values: JSONSchema4Type[],
  field: string,
  candidates: unknown,
): string[] | null {
  if (!candidates) return null;
  if (!Array.isArray(candidates)) {
    console.warn(
      `Warning: Ignoring ${field} of ${path} because it does not look valid, should be a list of valid identifiers`,
    );
    return null;
  }
  const hasBadCandidates = !candidates.every(isValidJsIdentifier);
  if (hasBadCandidates) {
    console.warn(`Warning: Ignoring ${field} of ${path} because some values are not valid identifiers`);
    return null;
  }
  if (candidates.length !== values.length) {
    console.warn(
      `Warning: Ignoring ${field} of ${path} because number of names does not correspond to number of values`,
    );
    return null;
  }
  return candidates as string[];
}

// @TODO: Cover with tests
async function schemaToTsTypeDeclaration(
  document: OpenApiDocument,
  project: Project,
  schema: JSONSchema4,
  path: string,
  name: string,
  rootNamespaceName: string,
  skipAdditionalProperties: boolean,
  namedEnums: boolean,
  shouldSortFields: boolean,
  ignoreMinMaxItems: boolean,
): Promise<string> {
  replaceRefsWithTsTypes(schema, '#/components/schemas/', rootNamespaceName);
  trimTypeTitles(schema);
  if (skipAdditionalProperties) {
    placeExplicitAdditionalProperties(schema, false);
  }
  if (shouldSortFields) {
    sortFields(schema);
  }
  if (namedEnums) {
    const enumValues = schema.enum;
    if (enumValues) {
      let tsEnumNames: string[] | null = null;
      if (schema.tsEnumNames) {
        const candidates = parseEnumNameCandidates(path, enumValues, 'tsEnumNames', schema.tsEnumNames);
        delete schema.tsEnumNames;
        if (candidates) tsEnumNames = candidates;
      }
      if (!tsEnumNames && schema['x-enumNames']) {
        const candidates = parseEnumNameCandidates(path, enumValues, 'x-enumNames', schema['x-enumNames']);
        if (candidates) tsEnumNames = candidates;
      }
      if (!tsEnumNames) {
        const candidates = enumValues;
        const noBadCandidates = candidates.every(isValidJsIdentifier);
        if (noBadCandidates) {
          tsEnumNames = candidates as string[];
        } else {
          console.warn(
            `Warning: Can not use values of ${path} as enum member names because some of them are not valid identifiers`,
          );
        }
      }
      if (tsEnumNames) {
        schema.tsEnumNames = tsEnumNames;
      } else {
        console.warn(`Warning: Enum ${path} will be generated as union type because no valid names are available`);
      }
    }
  }
  if (document.openapi.startsWith('3.0.')) {
    schema = openapiSchemaToJsonSchema(schema);
  }

  const rawTsTypeDeclaration = await compile(schema, name, {
    bannerComment: '',
    enableConstEnums: false,
    ignoreMinAndMaxItems: ignoreMinMaxItems,
  });

  // @NOTE: json-schema-to-typescript forcibly converts type names to CamelCase,
  //        so we have to convert them back to original casing if possible
  const generatedName = toSafeString(name);
  const targetName = isValidJsIdentifier(name) ? name : generatedName;
  let tsTypeDeclaration = rawTsTypeDeclaration;
  if (targetName !== generatedName) {
    const tempFile = project.createSourceFile('temp.ts', rawTsTypeDeclaration);
    const tsInterface = tempFile.getInterface(generatedName);
    if (tsInterface) {
      tsInterface.rename(name);
    }
    const tsEnum = tempFile.getEnum(generatedName);
    if (tsEnum) {
      tsEnum.rename(name);
    }
    const tsTypeAlias = tempFile.getTypeAlias(generatedName);
    if (tsTypeAlias) {
      tsTypeAlias.rename(name);
    }

    tsTypeDeclaration = tempFile.getText();
    project.removeSourceFile(tempFile);
  }

  return tsTypeDeclaration;
}

export interface GenerateProps {
  exportName: string;
  /**
   * A Swagger Object, or the file path or URL of your Swagger API.
   * @see https://apitools.dev/swagger-parser/docs/swagger-parser.html#parseapi-options-callback
   */
  input: string | Document;
  outputPath?: string;
  skipValidate?: boolean;
  sortFields?: boolean;
  unionEnums?: boolean;
  keepAdditionalProperties?: boolean;
  ignoreMinMaxItems?: boolean;
}

async function generate({
  exportName,
  input,
  outputPath,
  skipValidate = false,
  sortFields = false,
  unionEnums = false,
  keepAdditionalProperties = false,
  ignoreMinMaxItems = false,
}: GenerateProps) {
  const validate = !skipValidate;
  const namedEnums = !unionEnums;
  const skipAdditionalProperties = !keepAdditionalProperties;
  //
  // @SECTION: Setup
  const [openApiParser, openApiDocument] = await parseToOpenApi(input, { validate });
  //
  const project = new Project({ useInMemoryFileSystem: true });
  const generatedFile = project.createSourceFile(`generated.ts`);
  const rootNamespace = generatedFile.addModule({
    declarationKind: ModuleDeclarationKind.Namespace,
    name: exportName,
    isExported: true,
  });
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
        const path = `#/components/schemas/${name}`;

        let targetNamespace = rootNamespace;
        for (const namespaceName of namespaceNames) {
          const childNamespace = targetNamespace.getModule(namespaceName);
          if (childNamespace) targetNamespace = childNamespace;
          else
            targetNamespace = targetNamespace.addModule({
              declarationKind: ModuleDeclarationKind.Namespace,
              name: namespaceName,
              isExported: true,
            });
        }

        const jsonSchema = cloneDeep(schema) as JSONSchema4;
        const tsTypeDeclaration = await schemaToTsTypeDeclaration(
          openApiDocument,
          project,
          jsonSchema,
          path,
          name,
          exportName,
          skipAdditionalProperties,
          namedEnums,
          sortFields,
          ignoreMinMaxItems,
        );
        targetNamespace.addStatements((writer) => {
          writer.write(tsTypeDeclaration);
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
        type: (writer) => writer.quote('1'),
      },
    ],
  });
  apiInterface.addProperty({
    name: 'routes', // NOTE: E.g. PetStore.Api['routes']
    type: Writers.objectType({
      properties: await Promise.all(
        Object.entries(openApiDocument.paths).map(async ([route, pathItem]) => {
          if (!pathItem) {
            // @NOTE: This should never happen in practice, because we are iterating over existing keys
            // @REFERENCE: https://github.com/kogosoftwarellc/open-api/pull/702
            throw new Error(`Unexpected situation, pathItem of ${route} is missing`);
          }
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
                      const jsonMediaType = maybe(requestBody.content['application/json']);
                      const formDataMediaType = maybe(
                        requestBody.content['multipart/form-data'] ||
                          requestBody.content['application/x-www-form-urlencoded'],
                      );
                      if (jsonMediaType) {
                        const schema = jsonMediaType.schema;
                        if (!schema) {
                          throw new Error(`Unexpected situation, schema for request body of ${route} is missing`);
                        }
                        const tsTypeExpression = await schemaToTsTypeExpression(
                          openApiDocument,
                          project,
                          schema,
                          exportName,
                          skipAdditionalProperties,
                          sortFields,
                          ignoreMinMaxItems,
                        );
                        operationProperties.push({ name: 'body', type: tsTypeExpression, hasQuestionToken: !required });
                      } else if (formDataMediaType) {
                        // @NOTE: Form data currently can not be typed further, so we ignore everything else
                        operationProperties.push({ name: 'body', type: 'FormData', hasQuestionToken: !required });
                      } else {
                        console.warn(`Warning: Unknown media type for request body of ${route}`);
                        operationProperties.push({ name: 'body', type: 'unknown', hasQuestionToken: !required });
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
                        const tsTypeExpression = await schemaToTsTypeExpression(
                          openApiDocument,
                          project,
                          schema,
                          exportName,
                          skipAdditionalProperties,
                          sortFields,
                          ignoreMinMaxItems,
                        );
                        paramProperties.push({
                          name: parameter.name,
                          type: tsTypeExpression,
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
                        const tsTypeExpression = await schemaToTsTypeExpression(
                          openApiDocument,
                          project,
                          schema,
                          exportName,
                          skipAdditionalProperties,
                          sortFields,
                          ignoreMinMaxItems,
                        );
                        paramProperties.push({
                          name: parameter.name,
                          type: tsTypeExpression,
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
                      // @TODO: This is flaky, what if response has multiple status codes?
                      const http200 = resolveRef(openApiParser, responses['200']); // @NOTE: OpenAPI types are wrong about this index type
                      if (http200) {
                        const mediaTypeObject = http200.content;
                        if (mediaTypeObject) {
                          // @TODO: This is flaky, what if response has multiple media types?
                          // @TODO: Add textual media types
                          const jsonMediaType = maybe(mediaTypeObject['application/json']);
                          if (jsonMediaType) {
                            const schema = jsonMediaType.schema;
                            if (!schema) {
                              throw new Error(`Unexpected situation, schema for response body of ${route} is missing`);
                            }
                            const tsTypeExpression = await schemaToTsTypeExpression(
                              openApiDocument,
                              project,
                              schema,
                              exportName,
                              skipAdditionalProperties,
                              sortFields,
                              ignoreMinMaxItems,
                            );
                            operationProperties.push({
                              name: 'response',
                              type: tsTypeExpression,
                              hasQuestionToken: false,
                            });
                          } else {
                            operationProperties.push({ name: 'response', type: 'ArrayBuffer' });
                            operationProperties.push({
                              name: 'responseType',
                              type: (writer) => writer.quote('arraybuffer'),
                            });
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
  //
  if (outputPath) {
    await mkdirp(nodePath.dirname(outputPath));
    await outerFs.writeFile(outputPath, generatedCodeString);
  }
  //
  return generatedCodeString;
}

export { generate };
export default generate;
