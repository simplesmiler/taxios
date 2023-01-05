# `@simplesmiler/taxios-generate`

> Generate API typings for [Taxios](https://github.com/simplesmiler/taxios/tree/master/packages/taxios) from Swagger/OpenAPI.

## Generate

```sh
taxios-generate [options] <input-file-or-url>
```

```
Options:
  -o, --out FILE                    Write into this file
  -e, --export NAME                 Export generated definition under this name
      --skip-validation             Skip strict schema validation
      --named-enums                 [0.2.4+] Generate named enums instead of union types when possible
      --skip-additional-properties  [0.2.5+] Skip generating`[k: string]: unknown` for objects, unless explicitly asked
      --sort-fields                 [0.2.10+] Sort fields in interfaces instead of keeping the order from source
      --ignore-min-max-items        [0.2.14+] Ignore min and max items for arrays, preventing tuples being generated
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

## [0.2.4+] Union types and Named enums

> **WARNING**: The following only applies to "standalone" enums. Inline enums can only be expressed as inline union types.

> **WARNING**: Since 0.3.0 `--named-enums` is the default behavior, and to generate union types use `--union-enums`.

Look at the following OpenAPI snippet:

```yaml
components:
  schemas:
    PetStatus:
      enum: [Placed, Approved, Delivered]
```

Prior to 0.2.4 `taxios-generate` would generate a union type:

```ts
export type OrderStatus = 'Placed' | 'Approved' | 'Delivered';
```

Since 0.2.4 you can use `--named-enums` option to generate a named enum instead:

```ts
export enum OrderStatus {
  Placed = 'Placed',
  Approved = 'Approved',
  Delivered = 'Delivered',
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

## [0.2.5+] Additional properties

> **WARNING**: Since 0.3.0 `--skip-additional-properties` is the default behavior, and to generate additional properties use `--keep-additional-properties`.

Look at the following OpenAPI snippet:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
```

Prior to 0.2.5 `taxios-generate` would generate an interface with explicitly allowed additional properties:

```ts
export interface User {
  name?: string;
  [k: string]: unknown;
}
```

Since 0.2.5 you can use `--skip-additional-properties` option to generate an interface without then:

```ts
export interface User {
  name?: string;
}
```

This option treats unspecified value of OpenAPI `additionalProperties` field as `false`.

If `additionalProperties` is explicitly given as `true`, then `[k: string]: unknown` will still be added.

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
      additionalProperties: true
```

## [0.2.10+] Sort fields

Look at the following OpenAPI snippet:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        email:
          type: string
      required:
        - name
        - email
      additionalProperties: false
```

Prior to 0.2.10 fields in generated interface would always be in the same order as in the source:

```ts
export interface User {
  name: string;
  email: string;
}
```

Since 0.2.10 you can use `--sort-fields` option to enforce the alphabetical order of fields:

```ts
export interface User {
  email: string;
  name: string;
}
```

This option is useful if you want to minimize merge conflicts, and do have not control over the source OpenAPI document.
