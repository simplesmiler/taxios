export namespace MinMaxItems {
  /**
   * List of tags, not to many
   *
   * @minItems 0
   * @maxItems 3
   */
  export type Tags = [] | [string] | [string, string] | [string, string, string];
  /**
   * Sequence of bytes, can be empty
   *
   * @minItems 0
   * @maxItems 2147483647
   */
  export type Bytes = number[];
  /**
   * List of emails, at least one
   *
   * @minItems 1
   * @maxItems 2147483647
   */
  export type Emails = [string, ...string[]];
}

export interface MinMaxItems {
  version: '1';
  routes: {
    '/v1/roles': {
      GET: {};
    };
  };
}
