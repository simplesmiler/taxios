export namespace snake_case {
  export type NotAValidIdentifier = number;
  export enum rubiks_cube_face {
    f = 'f',
    r = 'r',
    u = 'u',
    l = 'l',
    b = 'b',
    d = 'd',
  }
  export interface rubiks_cube_step {
    face: snake_case.rubiks_cube_face;
    turns: -1 | 1 | 2;
  }
  export type rubiks_cube_algorithm = snake_case.rubiks_cube_step[];
}

export interface snake_case {
  version: '1';
  routes: {
    '/v1/test': {
      GET: {};
    };
    '/v1/params/{snake_param}': {
      GET: {
        params: {
          snake_param: string;
        };
      };
    };
  };
}
