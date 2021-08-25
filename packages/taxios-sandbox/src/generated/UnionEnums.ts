export namespace UnionEnums {
  export type OrderStatus = 'Placed' | 'Approved' | 'Delivered';
  export type StatusCode = 200 | 400;
  export type ValidIdentifier = '$' | '_' | 'a1' | 'привет' | '日本' | 'null' | 'delete';
  export type InvalidIdentifier = '1' | ' untrimmed ' | '#' | null | true | [1, 2];
  export type RubiksCubeAlgorithm = {
    face: 'F' | 'R' | 'U' | 'L' | 'B' | 'D';
    turns: -1 | 1 | 2;
  }[];
}

export interface UnionEnums {
  version: '1';
  routes: {
    '/v1/roles': {
      GET: {};
    };
  };
}
