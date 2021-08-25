export namespace KeepAdditionalProperties {
  export interface User {
    name?: string;
    [k: string]: unknown;
  }
  export interface Implicit {
    name?: string;
    [k: string]: unknown;
  }
  export interface ExplicitSkip {
    name?: string;
  }
  export interface ExplicitKeep {
    name?: string;
    [k: string]: unknown;
  }
}

export interface KeepAdditionalProperties {
  version: '1';
  routes: {
    '/v1/roles': {
      GET: {};
    };
  };
}
