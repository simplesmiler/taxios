# `@simplesmiler/taxios`

> TypeScript wrapper over Axios.

## Use

Typings for your API can be generated with [@simplesmiler/taxios-generate](https://github.com/simplesmiler/taxios/tree/master/packages/taxios-generate) package.

Example typings: [PetStore.ts](https://github.com/simplesmiler/taxios/blob/master/packages/taxios-sandbox/src/generated/PetStore.ts) (generated from the [PetStore](https://petstore.swagger.io/) Swagger).

```ts
import axios from 'axios';
import { Taxios } from '@simplesmiler/taxios';
import { PetStore } from './PetStore';
const taxios = new Taxios<PetStore>(axios.create({ baseURL: 'https://petstore.swagger.io/v2' }));
```

```ts
// <method> returns whole response.
const inventoryResponse = await taxios.get('/store/inventory');

// $<method> returns response body.
const inventory = await taxios.$get('/store/inventory');

// Url params example.
// Note the literal route from Swagger/OpenAPI instead of interpolated url.
const pet = await taxios.$get('/pet/{id}', { params: { id: 1 } });

// Query string params example.
const found = await taxios.$get('/pet/findByStatus', { query: { status: ['sold', 'pending'] } });
```

```ts
// Full arguments
await taxios.<method>(url, config); // For methods without body, like GET and DELETE
await taxios.<method>(url, body, config); // For methods with body, like POST and PUT

// Config
{
  // Url params, e.g. { id: 5 } for /api/pet/{id} -> /api/pet/5
  params: { key: value },
  //
  // Query string params, e.g. { status: ['sold', 'pending'] } for /api/pets/findByStatus?status=sold,pending
  query: { key: value },
  //
  // The rest of axios config, if you need it, e.g. { headers: { 'X-Visitor-Id': 1 } }
  axios: { ... },
};
```
