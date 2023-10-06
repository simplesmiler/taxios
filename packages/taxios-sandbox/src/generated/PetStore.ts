export namespace PetStore {
  export interface ApiResponse {
    code?: number;
    type?: string;
    message?: string;
  }
  export interface Category {
    id?: number;
    name?: string;
  }
  export interface Pet {
    id?: number;
    category?: PetStore.Category;
    name: string;
    photoUrls: string[];
    tags?: PetStore.Tag[];
    /**
     * pet status in the store
     */
    status?: 'available' | 'pending' | 'sold';
  }
  export interface Tag {
    id?: number;
    name?: string;
  }
  export interface Order {
    id?: number;
    petId?: number;
    quantity?: number;
    shipDate?: string;
    /**
     * Order Status
     */
    status?: 'placed' | 'approved' | 'delivered';
    complete?: boolean;
  }
  export interface User {
    id?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
    /**
     * User Status
     */
    userStatus?: number;
  }
}

export interface PetStore {
  version: '1';
  routes: {
    '/pet/{petId}/uploadImage': {
      POST: {
        body?: FormData;
        params: {
          petId: number;
        };
        response: PetStore.ApiResponse;
      };
    };
    '/pet': {
      POST: {
        body: PetStore.Pet;
      };
      PUT: {
        body: PetStore.Pet;
      };
    };
    '/pet/findByStatus': {
      GET: {
        query: {
          status: ('available' | 'pending' | 'sold')[];
        };
        response: PetStore.Pet[];
      };
    };
    '/pet/findByTags': {
      GET: {
        query: {
          tags: string[];
        };
        response: PetStore.Pet[];
      };
    };
    '/pet/{petId}': {
      GET: {
        params: {
          petId: number;
        };
        response: PetStore.Pet;
      };
      POST: {
        body?: FormData;
        params: {
          petId: number;
        };
      };
      DELETE: {
        params: {
          petId: number;
        };
      };
    };
    '/store/order': {
      POST: {
        body: PetStore.Order;
        response: PetStore.Order;
      };
    };
    '/store/order/{orderId}': {
      GET: {
        params: {
          orderId: number;
        };
        response: PetStore.Order;
      };
      DELETE: {
        params: {
          orderId: number;
        };
      };
    };
    '/store/inventory': {
      GET: {
        response: {
          [k: string]: number;
        };
      };
    };
    '/user/createWithArray': {
      POST: {
        body: PetStore.User[];
      };
    };
    '/user/createWithList': {
      POST: {
        body: PetStore.User[];
      };
    };
    '/user/{username}': {
      GET: {
        params: {
          username: string;
        };
        response: PetStore.User;
      };
      PUT: {
        body: PetStore.User;
        params: {
          username: string;
        };
      };
      DELETE: {
        params: {
          username: string;
        };
      };
    };
    '/user/login': {
      GET: {
        query: {
          username: string;
          password: string;
        };
        response: string;
      };
    };
    '/user/logout': {
      GET: {};
    };
    '/user': {
      POST: {
        body: PetStore.User;
      };
    };
  };
}
