export namespace Enum {
  export const enum OrderStatus {
    Placed = 'Placed',
    Approved = 'Approved',
    Delivered = 'Delivered',
  }
  export const enum StatusCode {
    Ok = 200,
    BadRequest = 400,
  }
  export const enum NamedEnum {
    $ = '$',
    _ = '_',
    a1 = 'a1',
    привет = 'привет',
    日本 = '日本',
    null = 'null',
    delete = 'delete',
  }
  export type UnionType = '1' | ' untrimmed ' | '#' | null | true | [1, 2];
  export type RubiksCubeAlgorithm = {
    face: 'F' | 'R' | 'U' | 'L' | 'B' | 'D';
    turns: -1 | 1 | 2;
  }[];
}

export interface Enum {
  version: '1';
  routes: {
    '/v1/roles': {
      GET: {};
    };
  };
}
