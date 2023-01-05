export namespace MinMaxItems {
  /**
   * List of tags, not to many
   */
  export type Tags = string[];
  /**
   * Sequence of bytes, can be empty
   */
  export type Bytes = number[];
  /**
   * List of emails, at least one
   */
  export type Emails = string[];
}

export interface MinMaxItems {
  version: '1';
  routes: {
    '/v1/roles': {
      GET: {};
    };
  };
}
