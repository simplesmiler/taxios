export namespace NamedEnums {
  export enum OrderStatus {
    Placed = 'Placed',
    Approved = 'Approved',
    Delivered = 'Delivered',
  }
  export enum StatusCode {
    Ok = 200,
    BadRequest = 400,
  }
  export enum ValidIdentifier {
    $ = '$',
    _ = '_',
    a1 = 'a1',
    привет = 'привет',
    日本 = '日本',
    null = 'null',
    delete = 'delete',
  }
  export type InvalidIdentifier = '1' | ' untrimmed ' | '#' | null | true | [1, 2];
  export type RubiksCubeAlgorithm = {
    face: 'F' | 'R' | 'U' | 'L' | 'B' | 'D';
    turns: -1 | 1 | 2;
  }[];
}

export interface NamedEnums {
  version: '1';
  routes: {
    '/v1/roles': {
      GET: {};
    };
  };
}
