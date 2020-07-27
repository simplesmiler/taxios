# `@simplesmiler/taxios-generate`

> Generate API typings for [Taxios](https://github.com/simplesmiler/taxios/tree/master/packages/taxios) from Swagger/OpenAPI.

## Generate

```sh
taxios-generate [options] <input-file-or-url>
```

```
Options:
  -o, --out FILE           Write into this file
  -e, --export NAME        Export generated definition under this name
      --skip-validation    Skip strict schema validation
```

## Example

Swagger: https://petstore.swagger.io/

```
taxios-generate -o PetStore.ts -e PetStore https://petstore.swagger.io/v2/swagger.json
```

Result: [PetStore.ts](https://github.com/simplesmiler/taxios/blob/master/packages/taxios-sandbox/src/generated/PetStore.ts)

## Use

```ts
import axios from 'axios';
import { Taxios } from '@simplesmiler/taxios';
import { PetStore } from './PetStore';

const taxios = new Taxios<PetStore>(axios.create({ baseUrl: 'https://petstore.swagger.io/v2' }));
const pet = await taxios.get('/pet/{petId}', { params: { petId: 1 } });
```

See [@simplesmiler/taxios](https://github.com/simplesmiler/taxios/tree/master/packages/taxios) package for details.
