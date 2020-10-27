# `taxios`

> TypeScript wrapper over Axios.

## Use

Install packages.

```sh
npm i axios @simplesmiler/taxios
npm i -D @simplesmiler/taxios-generate
```

Generate typings with [@simplesmiler/taxios-generate](https://github.com/simplesmiler/taxios/tree/master/packages/taxios-generate).

```sh
npx taxios-generate -o PetStore.ts -e PetStore https://petstore.swagger.io/v2/swagger.json
```

Use typings with [@simplesmiler/taxios](https://github.com/simplesmiler/taxios/tree/master/packages/taxios).

```ts
import axios from 'axios';
import { Taxios } from '@simplesmiler/taxios';

// Import generated typings
import { PetStore } from './PetStore';

// Create axios client and taxios wrapper
const taxios = new Taxios<PetStore>(axios.create({ baseURL: 'https://petstore.swagger.io/v2' }));

// Make request
const pet = await taxios.get('/pet/{petId}', { params: { petId: 1 } });
```
