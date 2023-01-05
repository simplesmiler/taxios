export namespace Nullable {
  export interface User {
    name: string;
    alias: string | null;
  }
}

export interface Nullable {
  version: '1';
  routes: {
    '/v1/test': {
      GET: {};
    };
  };
}
