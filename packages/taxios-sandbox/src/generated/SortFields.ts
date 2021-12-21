export namespace SortFields {
  export interface User {
    email: string;
    name: string;
  }
}

export interface SortFields {
  version: '1';
  routes: {
    '/v1/test': {
      GET: {};
    };
  };
}
