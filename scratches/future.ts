/**
 * Goals:
 *   - Support typed error responses.
 *   - Support multiple success status codes for a single endpoint.
 *     E.g. POST /tasks can return 200 OK for fast tasks but 202 Accepted for slow tasks.
 *   - Support accept header and response content types (e.g. json and pdf)
 *   - Go from "everything is either json of arraybuffer" to separating between:
 *      - Semantic type (typescript interface)
 *      - Content type (text/plain, text/html, text/xml, application/json, application/octet-stream, multipart/form-data)
 *      - Processing type (text, document, json, arraybuffer, stream, blob, form data)
 *   - Support typed interceptors.
 *   - Add optional runtime validator. Tree-shake if not used.
 * Explicitly cater to breaking changes:
 *   - Responses succeed even on 4xx and 5xx, and only network errors and response parsing throw.
 *     This allows for typed error handling, but breaks convention of jquery/axios.
 *     Approach: option to throw on errors, opt-in per call, or global opt-in with local opt-out.
 *   - Simple cases should not become complicated, e.g. `const users = await taxios.$get('/users')`.
 *     Approach: for $ calls assume json content type and json processing by default, return .
 * Non goals:
 *   - Infer typings from inlined JSON instead of generating them. Tree-shake JSON if not used at runtime.
 *     Reasoning: problems with non-const enums, referring to model by name (e.g. API.Grid.Column), autocomplete speed.
 *   - Support text encodings other than utf-8. Reasoning: probably not many people who still use it?
 *     Can be catered to by supporting transform step for requests and responses.
 * Notes:
 *   - Blob is a box with a single content entry of certain content type, and there is no content type for blob
 *   - FormData is a bag with multiple content entries, each with it's own content type, including possible nested multipart/form-data.
 */

/**
 * Request
 * - URL template
 * - Method (e.g. get, post, put, delete)
 * - Params, Query (including serialization)
 * - Body
 * - Headers (Content Mime, Accept Mime)
 * - Send format (write as text with encoding, form data, json, arraybuffer (covers typed arrays and node buffers), blob, node stream, web stream, document)
 *
 * Response:
 * - Status code (200 with result, 202 with job handler, 40x with error)
 * - Headers (ContentMime)
 * - Receive format (read as text with encoding, form data, json, arraybuffer (covers typed arrays and node buffers), blob, node stream, web stream, document)
 */

import Stream from "stream";
import { Opaque } from "D:/Work/me/taxios/packages/taxios/node_modules/type-fest";

namespace Schema {
  export interface Report {
    uid: string;
    name: string;
  }
  export interface ReportSchema {
    key: string;
    columns: Grid.Column[];
  }
  export interface ReportData {
    rows: Grid.Row[];
  }

  export namespace Grid {
    export enum ColumnType {
      String = "String",
      Number = "Number",
      Boolean = "Boolean",
    }
    export interface Column {
      uid: string;
      name: string;
      type: ColumnType;
    }
    export type Value = string | number | boolean | null;
    export type Row = Value[];
  }

  export interface Error {
    message: string;
  }
}

interface Schema {
  version: "2";
  routes: {
    "/reports": {
      GET: {
        body: never;
        response:
          | [200, "application/json", Schema.Report[]]
          | [200, "application/pdf", unknown]
          | [401 | 403 | 404, "application/json", Schema.Error]
          | [500, string, unknown];
      };
      POST: {
        body: ["application/json"];
      };
    };
  };
}

// @NOTE: Why would I need JSON?
//        - For validation I think I would rather generate validator functions, and maybe symbols

let blank: unknown;

// ===

namespace PromiseTools {
  export type Unwrap<W> = W extends Promise<infer T> ? T : never;

  // @NOTE: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
  export type WrapDistributed<T> = T extends unknown ? Promise<T> : never;
  export type WrapCollected<T> = Promise<T>; // @NOTE: Seems to be the same as explicit collect
  export type WrapCollectedExplicit<T> = [T] extends [unknown]
    ? Promise<T>
    : never;

  // @DOC: Union of wrappers to wrapper of union, e.g. R<A> | R<B> -> R<A | B>
  export type Collect<W> = WrapCollected<Unwrap<W>>;

  // @DOC: Wrapper of union to union of wrappers, e.g. R<A | B> -> R<A> | R<B>
  export type Distribute<W> = WrapDistributed<Unwrap<W>>;

  export function collect<W>(w: W): Collect<W> {
    return w as unknown as Collect<W>;
  }
}

// ===

type Vars = ['GET', '/users'] | ['POST', '/users'] | ['GET', '/users/{id}'];
type Opts = Vars extends [infer M, infer U] ? M extends string ? { method: M, url: U } : unknown : unknown;
function get(opts: Opts) {

}

get({ method: 'POST', url: '/users/{id}' });

// ===

interface TaxiosFetcher {
  __optsMarker: unknown;
}


interface FetchOpts {
  fetchTest: string;
}
class FetchFetcher implements TaxiosFetcher {
  __optsMarker: FetchOpts;
  constructor() {
    throw new Error("Not implemented");
  }
}

class Taxios<TSchema extends Schema, TFetcher extends TaxiosFetcher> {
  constructor(fetcher: TFetcher) {
    throw new Error("Not implemented");
  }
  async get(
    url: string,
    opts?: { headers: Record<string, string | string[]> } & { fetcher?: TFetcher['__optsMarker'] }
  ): Promise<
    Taxios.TaxiosResponse.WrapDistributed<
      | [200, Taxios.JsonMimeType, Schema.Report]
      | [403, Taxios.JsonMimeType, Schema.Error]
    >
  > {
    throw new Error("Not implemented");
  }
  async post(
    url: string,
    body: unknown,
    opts?: {}
  ): Promise<
    Taxios.TaxiosResponse.WrapDistributed<
      | [200, Taxios.JsonMimeType, Schema.User]
      | [403, Taxios.JsonMimeType, Schema.Error]
    >
  > {
    throw new Error("Not implemented");
  }
}

async function main() {
  const fetcher = new FetchFetcher();
  const taxios = new Taxios<Schema, FetchFetcher>(fetcher);

  {
    const user = await taxios
      .get("/user", { headers: { Accept: ["application/json"] }, fetcher: { fetchTest: 1 } })
      .then((r) => {
        if (r.status === 200) return r.body;
        throw new Error("Unhandled");
      });
  }

  {
    const rows = [];

    const response1 = await taxios.post(
      "/reports",
      { rows },
      { headers: { "Content-Type": "application/json" } }
    );
  }

  {
    const response = await taxios.post("/v1/users", { name: "Hugo" });
    if (response.status === 200) {
      const user = await response.json();
    }
  }
}

namespace Taxios {
  export type JsonMimeType = "application/json";
  export type FormDataMimeType = "multipart/form-data";
  export type DocumentMimeType =
    | "text/html"
    | "application/xml"
    | "text/xml"
    | `${string}+xml`;

  // Common between Node and Web
  export type BrandedString<T, CT extends string> = Opaque<string, [T, CT]>;
  export type BrandedJson<T, CT extends string> = Opaque<T, [T, CT]>; // @NOTE: Not opaque because it's native to TS
  export type BrandedArrayBuffer<T, CT extends string> = Opaque<
    ArrayBuffer,
    [T, CT]
  >; // @NOTE: Supertype of Node Buffer and Web TypedArray
  export type BrandedDataView<T, CT extends string> = Opaque<DataView, [T, CT]>; // @NOTE: Can not receive from Response, so only supports sending
  // @NOTE: Specific to Web, but likely to become partially supported on Node soonish,
  //        e.g. Node 16 experimentally supports web streams and blobs
  export type BrandedFormData<T, CT extends string> = Opaque<FormData, [T, CT]>;
  export type BrandedBlob<T, CT extends string> = Opaque<Blob, [T, CT]>; // @NOTE: Supertype of File, also blob includes it own content type
  export type BrandedReadableWebStream<T, CT extends string> = Opaque<
    ReadableStream<Uint8Array>,
    [T, CT]
  >; // @NOTE: Same for both Request and Response
  export type BrandedDocument<T, CT extends string> = Opaque<Document, [T, CT]>; // @NOTE: This is xml and html
  // @NOTE: Specific to Node
  export type BrandedReadableNodeStream<T, CT extends string> = Opaque<
    Stream.Readable,
    [T, CT]
  >;
  export type BrandedReadableNodeBuffer<T, CT extends string> = Opaque<
    Buffer,
    [T, CT]
  >;

  export type Url = string;
  export type Method = "GET" | "POST" | "PUT" | "DELETE";
  export type ContentType = string;
  export type Accepts = ContentType[];
  export type Body<T, CT extends string> =
    | BrandedString<T, CT>
    | (CT extends JsonMimeType ? BrandedJson<T, CT> : never)
    | BrandedArrayBuffer<T, CT>
    | BrandedDataView<T, CT>
    | (CT extends FormDataMimeType ? BrandedFormData<T, CT> : never)
    | BrandedBlob<T, CT>
    | BrandedReadableWebStream<T, CT>
    | (CT extends DocumentMimeType ? BrandedDocument<T, CT> : never);

  type SendFilter<T> = ["application/json", Body<T, "application/json">];

  export type Status = number;

  /**
   * Single Url + Single Method -> Single Query + Single Params + Multiple [ContentType, Body] + Multiple Accept
   * Example:
   *    - ['/reports', 'POST', [JsonMimeType, API.ReportSubmit] | ['application/xlsx', unknown], JsonMimeType]
   *    - ['/report/{reportId}', 'GET', never, JsonMimeType | 'application/xlsx']
   */
  export type RequestSignature = [Url, Method, ContentType, unknown, Accepts];
  export type ResponseSignature = [Status, ContentType, unknown];

  /**
   * Url, Method -> Single Params, Simple Query             -- Request
   * Url, Method -> Multiple [ContentType, Body]            -- Request
   * Url, Method -> Multiple [Status, ContentType, Body]    -- Response
   */

  export interface TaxiosResponse<W extends ResponseSignature>
    extends Response {
    status: W[0];
    json(): Promise<
      W[1] extends "application/json"
        ? Taxios.BrandedJson<W[2], "application/json">
        : never
    >;
    body: Taxios.BrandedReadableWebStream<W[2], W[1]>;
  }

  export namespace TaxiosResponse {
    export type Unwrap<W> = W extends TaxiosResponse<infer T> ? T : never;

    // @NOTE: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
    export type WrapDistributed<T> = T extends ResponseSignature
      ? TaxiosResponse<T>
      : never;
    export type WrapCollected<T> = [T] extends [ResponseSignature]
      ? TaxiosResponse<T>
      : never;

    // @DOC: Union of wrappers to wrapper of union, e.g. W<A> | W<B> -> W<A | B>
    export type Collect<W> = WrapCollected<Unwrap<W>>;

    // @DOC: Wrapper of union to union of wrappers, e.g. W<A | B> -> W<A> | W<B>
    export type Distribute<W> = WrapDistributed<Unwrap<W>>;

    {
      const c = blank as WrapCollected<
        [200, JsonMimeType, Schema.User] | [403, JsonMimeType, Schema.Error]
      >;
      const d = blank as WrapDistributed<
        [200, JsonMimeType, Schema.User] | [403, JsonMimeType, Schema.Error]
      >;
    }
  }
}

// @DOC: Test assignability of buffer types
async function bufferAssignability() {
  type BaseBuffer = Opaque<ArrayBuffer, "Hello">;
  type WebBufferLikeNode = Opaque<Uint8Array, "Hello">;
  type WebBufferUnlikeNode = Opaque<Int32Array, "Hello">;
  type NodeBuffer = Opaque<Buffer, "Hello">;
  type WebDataView = Opaque<DataView, "Hello">;

  let base = blank as BaseBuffer;
  let webLikeNode = blank as WebBufferLikeNode;
  let webUnlikeNode = blank as WebBufferUnlikeNode;
  let webDataView = blank as WebDataView;
  let node = blank as NodeBuffer;

  base = webLikeNode; // ✅
  base = webUnlikeNode; // ✅
  base = webDataView;
  base = node; // ✅

  webUnlikeNode = base;
  webUnlikeNode = webLikeNode;
  webUnlikeNode = webDataView;
  webUnlikeNode = node;

  webLikeNode = base;
  webLikeNode = webUnlikeNode;
  webLikeNode = webDataView;
  webLikeNode = node; // ✅

  webDataView = base;
  webDataView = webLikeNode;
  webDataView = webUnlikeNode;
  webDataView = node;

  node = base;
  node = webLikeNode;
  node = webUnlikeNode;
  node = webDataView;
}

// @DOC: Experiment with send types of fetch
async function send() {
  const stream = blank as ReadableStream;
  const text = blank as string;
  const blob = blank as Blob;
  const buffer = blank as ArrayBuffer;
  const formData = blank as FormData;
  const urlSearchParams = blank as URLSearchParams;
  await fetch("", { method: "POST", body: stream });
  await fetch("", { method: "POST", body: text });
  await fetch("", { method: "POST", body: blob });
  await fetch("", { method: "POST", body: buffer });
  await fetch("", { method: "POST", body: formData });
}

// @DOC: Experiment with receive types of fetch
async function receive() {
  const response = await fetch("");
  const stream = response.body;
  const text = await response.text();
  const blob = await response.blob(); // @NOTE: Waits for full data, so DO NOT use blob.stream
  const buffer = await blob.arrayBuffer();
  const formData = await response.formData();
}
