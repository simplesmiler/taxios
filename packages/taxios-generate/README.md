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
      --named-enums        [0.2.3+] Generate named enums instead of union types when possible
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

const taxios = new Taxios<PetStore>(axios.create({ baseURL: 'https://petstore.swagger.io/v2' }));
const pet = await taxios.get('/pet/{petId}', { params: { petId: 1 } });
```

See [@simplesmiler/taxios](https://github.com/simplesmiler/taxios/tree/master/packages/taxios) package for details.

## [0.2.3+] Union types and Named enums

> **WARNING**: The following only applies to "standalone" enums. Inline enums can only be expressed as inline union types.

Look at the following OpenAPI snippet:

```yaml
components:
  schemas:
    PetStatus:
      enum: [Placed, Approved, Delivered]
```

Prior to 0.2.3 `taxios-generate` would generate a union type:

```ts
export namespace PetStore {
  export type OrderStatus = 'Placed' | 'Approved' | 'Delivered';
}
```

Since 0.2.3 you can use `--named-enums` option to generate a named enum instead:

```ts
export namespace PetStore {
  export enum OrderStatus {
    Placed = 'Placed',
    Approved = 'Approved',
    Delivered = 'Delivered',
  }
}
```

By default, enum names will be the same as values, assuming they are valid identifiers.

Names can also be given explicitly using `x-enumNames`. This is useful for numeric enums:

```yaml
components:
  schemas:
    StatusCode:
      enum: [200, 400]
      x-enumNames: [Ok, BadRequest]
```

If no valid names are available, `taxios-generate` will fallback to generating a union type.
