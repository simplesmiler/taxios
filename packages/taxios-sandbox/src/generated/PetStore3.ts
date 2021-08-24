export namespace PetStore3 {
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
  export interface Customer {
    id?: number;
    username?: string;
    address?: PetStore3.Address[];
  }
  export interface Address {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  }
  export interface Category {
    id?: number;
    name?: string;
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
  export interface Tag {
    id?: number;
    name?: string;
  }
  export interface Pet {
    id?: number;
    name: string;
    category?: PetStore3.Category;
    photoUrls: string[];
    tags?: PetStore3.Tag[];
    /**
     * pet status in the store
     */
    status?: 'available' | 'pending' | 'sold';
  }
  export interface ApiResponse {
    code?: number;
    type?: string;
    message?: string;
  }
}

export interface PetStore3 {
  version: '1';
  routes: {
    '/pet': {
      POST: {
        body: PetStore3.Pet;
        response: PetStore3.Pet;
      };
      PUT: {
        body: PetStore3.Pet;
        response: PetStore3.Pet;
      };
    };
    '/pet/findByStatus': {
      GET: {
        query?: {
          status?: 'available' | 'pending' | 'sold';
        };
        response: PetStore3.Pet[];
      };
    };
    '/pet/findByTags': {
      GET: {
        query?: {
          tags?: string[];
        };
        response: PetStore3.Pet[];
      };
    };
    '/pet/{petId}': {
      GET: {
        params: {
          petId: number;
        };
        response: PetStore3.Pet;
      };
      POST: {
        params: {
          petId: number;
        };
        query?: {
          name?: string;
          status?: string;
        };
      };
      DELETE: {
        params: {
          petId: number;
        };
      };
    };
    '/pet/{petId}/uploadImage': {
      POST: {
        body?: unknown;
        params: {
          petId: number;
        };
        query?: {
          additionalMetadata?: string;
        };
        response: PetStore3.ApiResponse;
      };
    };
    '/store/inventory': {
      GET: {
        response: {
          [k: string]: number;
        };
      };
    };
    '/store/order': {
      POST: {
        body?: PetStore3.Order;
        response: PetStore3.Order;
      };
    };
    '/store/order/{orderId}': {
      GET: {
        params: {
          orderId: number;
        };
        response: PetStore3.Order;
      };
      DELETE: {
        params: {
          orderId: number;
        };
      };
    };
    '/user': {
      POST: {
        body?: PetStore3.User;
      };
    };
    '/user/createWithList': {
      POST: {
        body?: PetStore3.User[];
        response: PetStore3.User;
      };
    };
    '/user/login': {
      GET: {
        query?: {
          username?: string;
          password?: string;
        };
        response: string;
      };
    };
    '/user/logout': {
      GET: {};
    };
    '/user/{username}': {
      GET: {
        params: {
          username: string;
        };
        response: PetStore3.User;
      };
      PUT: {
        body?: PetStore3.User;
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
  };
}
