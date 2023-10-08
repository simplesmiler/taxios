import OpenApiTypes from 'openapi-types';
import SwaggerParser from '@apidevtools/swagger-parser';
import { cloneDeep } from 'lodash';
// @ts-ignore
import converter from 'swagger2openapi';

export type Document = OpenApiTypes.OpenAPI.Document;
export type SwaggerDocument = OpenApiTypes.OpenAPIV2.Document;
export type OpenApiDocument = OpenApiTypes.OpenAPIV3.Document;
export type OpenApiReferenceObject = OpenApiTypes.OpenAPIV3.ReferenceObject;

// @TODO: What about TRACE? It is supported by OpenAPI, but not by Axios
type OpenApiMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
export const openApiMethods: OpenApiMethod[] = ['get', 'head', 'post', 'put', 'delete', 'options', 'patch'];

export function isOpenApiDocument(document: Document): document is OpenApiDocument {
  const assumed = document as any;
  return (
    Object.prototype.hasOwnProperty.call(assumed, 'openapi') &&
    typeof assumed.openapi === 'string' &&
    assumed.openapi.startsWith('3.')
  );
}

export function isSwaggerDocument(document: Document): document is SwaggerDocument {
  const assumed = document as any;
  return (
    Object.prototype.hasOwnProperty.call(assumed, 'swagger') &&
    typeof assumed.swagger === 'string' &&
    assumed.swagger.startsWith('2.')
  );
}

export function isOpenApiReferenceObject(obj: unknown): obj is OpenApiReferenceObject {
  const assumed = obj as any;
  return (
    typeof assumed === 'object' &&
    assumed !== null &&
    Object.prototype.hasOwnProperty.call(assumed, '$ref') &&
    typeof assumed.$ref === 'string'
  );
}

export function assertNoRef<T>(value: T | OpenApiReferenceObject): asserts value is T {
  if (isOpenApiReferenceObject(value)) {
    throw new Error('Found unresolved reference');
  }
}

export function assertNoRefsArray<T>(array: (T | OpenApiReferenceObject)[]): asserts array is T[] {
  for (const item of array) {
    assertNoRef(item);
  }
}

export function assertNoRefsObject<T>(
  obj: Record<string, OpenApiReferenceObject | T>,
): asserts obj is Record<string, T> {
  for (const value of Object.values(obj)) {
    assertNoRef(value);
  }
}

export function eraseRef<T>(withRef: T | OpenApiReferenceObject | undefined): T | undefined {
  if (withRef === undefined) return undefined;
  assertNoRef(withRef);
  return withRef;
}

export function eraseRefArray<T>(withRefs: (T | OpenApiReferenceObject)[] | undefined): T[] | undefined {
  if (withRefs === undefined) return undefined;
  assertNoRefsArray(withRefs);
  return withRefs;
}

export function eraseRefObject<T>(
  withRefs: Record<string, OpenApiReferenceObject | T> | undefined,
): Record<string, T> | undefined {
  if (withRefs === undefined) return undefined;
  assertNoRefsObject(withRefs);
  return withRefs;
}

export function resolve<T>(resolver: SwaggerParser, withRef: T | OpenApiReferenceObject): T {
  if (isOpenApiReferenceObject(withRef)) {
    const resolved = resolver.$refs.get(withRef.$ref);
    assertNoRef(resolved as T | OpenApiReferenceObject);
    return resolved as T;
  }
  return withRef;
}

export function resolveRef<T>(
  openApiParser: SwaggerParser,
  withRef: T | OpenApiReferenceObject | undefined,
): T | undefined {
  if (withRef === undefined) return undefined;
  const resolved = resolve(openApiParser, withRef);
  return resolved;
}

export function resolveRefArray<T>(
  openApiParser: SwaggerParser,
  withRefs: (T | OpenApiReferenceObject)[] | undefined,
): T[] | undefined {
  if (withRefs === undefined) return undefined;
  const resolved: T[] = new Array(withRefs.length);
  for (let i = 0; i < withRefs.length; i++) {
    resolved[i] = resolve(openApiParser, withRefs[i]);
  }
  return resolved;
}

export function resolveRefObject<T>(
  openApiParser: SwaggerParser,
  withRefs: Record<string, OpenApiReferenceObject | T> | undefined,
): Record<string, T> | undefined {
  if (withRefs === undefined) return undefined;
  const resolved: Record<string, T> = {};
  for (const [key, withRef] of Object.entries(withRefs)) {
    resolved[key] = resolve(openApiParser, withRef);
  }
  return resolved;
}

type ParseResult = [SwaggerParser, OpenApiDocument];

export async function parseToOpenApi(api: string | Document, opts: { validate: boolean }): Promise<ParseResult> {
  const preparser = new SwaggerParser();
  const preparsedDocument = await preparser.parse(api);
  //
  if (isSwaggerDocument(preparsedDocument)) {
    if (opts.validate) {
      const prevalidator = new SwaggerParser();
      await prevalidator.validate(cloneDeep(preparsedDocument)); // @NOTE: Will throw if encounters problems
    }
    //
    const converted = await converter.convertObj(preparsedDocument, {});
    //
    const validator = new SwaggerParser();
    await validator.validate(cloneDeep(converted.openapi)); // @NOTE: Will throw if encounters problems
    //
    const reparser = new SwaggerParser();
    const reparsedDocument = await reparser.parse(converted.openapi);
    if (isOpenApiDocument(reparsedDocument)) {
      return [reparser, reparsedDocument] as ParseResult;
    }
    throw new Error('Failed to validated converted document');
  }
  if (isOpenApiDocument(preparsedDocument)) {
    if (opts.validate) {
      const validator = new SwaggerParser();
      await validator.validate(cloneDeep(preparsedDocument)); // @NOTE: Will throw if encounters problems
    }
    //
    return [preparser, preparsedDocument] as ParseResult;
  }

  throw new Error('Failed to convert document to OpenAPI');
}

export function maybe<T>(value: T): T | undefined {
  return value;
}
