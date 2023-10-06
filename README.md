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

## Develop

1. Clone repo
2. `npm ci`
3. Change something in `taxios` or `taxios-generate` package
4. Test by running scripts in `taxios-sandbox` package

## Publish

1. `npm run build`
2. `npm run publish`
