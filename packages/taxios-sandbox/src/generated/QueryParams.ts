export namespace QueryParams {
  export interface Asset {
    currency: string;
    amount: number;
    [k: string]: unknown;
  }
}

export interface QueryParams {
  version: '1';
  routes: {
    '/v1/test': {
      GET: {
        query: {
          firstName: string;
          lastName?: string;
          age?: number;
          employed: boolean;
          languages?: ('ru' | 'en' | 'fr' | 'de' | 'jp')[];
          assets?: QueryParams.Asset[];
          qualities?: {
            good?: string[];
            bad?: string[];
          };
        };
      };
    };
  };
}
