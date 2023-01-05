export namespace OpenAPI31 {
  export interface User {
    name: string;
    alias: string | null;
  }
}

export interface OpenAPI31 {
  version: '1';
  routes: {
    '/v1/test': {
      GET: {};
    };
  };
}
