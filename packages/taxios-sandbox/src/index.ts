import { Readable } from 'stream';
import { inspect } from 'util';

import 'web-streams-polyfill';
import { Blob as BlobPolyfill } from '@web-std/blob';
import { File as FilePolyfill } from '@web-std/file';
import { FormData as FormDataPolyfill } from '@web-std/form-data';
global.Blob = BlobPolyfill;
global.File = FilePolyfill;
global.FormData = FormDataPolyfill;

import Axios from 'axios';
import { Taxios } from '../../taxios/src';
import { PetStore } from './generated/PetStore';
import { QueryParams } from './generated/QueryParams';
import { PetStore3 } from './generated/PetStore3';

// async function test1() {
//   if (Math.random() > 0.5) return Promise.resolve(0);
//   else return Promise.resolve('');
// }
// type U = Promise<string> | Promise<number>;
// type X = ReturnType<typeof Promise['resolve']>;
//
// function test(a: 1): Promise<string>;
// function test(a: 2): Promise<number>;
// function test(a: number): unknown {
//   throw new Error('Not implemented');
// }

declare function test1<T>(items: T[]): void;
// declare const x1: number[] | string[];
// test1(x1); // Compiler error

declare const y: string[] | number[];
test1(y);

async function main(): Promise<void> {
  {
    console.log('# Testing PetStore v2');
    const axios = Axios.create({ baseURL: 'https://petstore.swagger.io/v2' });
    const taxios = new Taxios<PetStore>(axios);
    //
    const url = taxios.url('GET', '/pet/{petId}', { params: { petId: 1 } });
    console.log(url);
    //
    try {
      const { data: pet } = await taxios.get('/pet/{petId}', {
        params: { petId: 1 },
      });
      console.log(pet);
    } catch (err) {
      console.error(err.message);
    }
    console.log('');
  }

  {
    console.log('# Testing PetStore v3');
    const axios = Axios.create({ baseURL: 'https://petstore3.swagger.io/api/v3' });
    const taxios = new Taxios<PetStore3>(axios);
    //
    const url = taxios.url('GET', '/pet/{petId}', { params: { petId: 1 } });
    console.log(url);
    //
    try {
      const { data: pet } = await taxios.get('/pet/{petId}', {
        params: { petId: 1 },
      });
      console.log(pet);
    } catch (err) {
      console.error(err.message);
    }
    try {
      // @NOTE: 1x1 white png
      // @REFERENCE: https://garethrees.org/2007/11/14/pngcrush/
      const bytes = bytesFromSparseHex(`
        8950 4e47 0d0a 1a0a 0000 000d 4948 4452
        0000 0001 0000 0001 0100 0000 0037 6ef9
        2400 0000 1049 4441 5478 9c62 6001 0000
        00ff ff03 0000 0600 0557 bfab d400 0000
        0049 454e 44ae 4260 82
      `);
      const response = await taxios.$post('/pet/{petId}/uploadImage', bytes.buffer, {
        params: { petId: 1 },
        axios: {
          headers: {
            'content-type': 'application/octet-stream',
          },
        },
      });
      console.log(response);
    } catch (err) {
      console.error(err.message);
    }
    console.log('');
  }

  {
    console.log('# Testing QueryParams');
    const axios = Axios.create();
    const taxios = new Taxios<QueryParams>(axios);
    const url = taxios.url('GET', '/v1/test', {
      query: {
        firstName: 'Denis',
        languages: ['ru', 'en'],
        employed: true,
        assets: [
          { currency: 'rub', amount: 1000 },
          { currency: 'usd', amount: 25 },
        ],
        qualities: {
          good: ['witty', 'kind'],
          bad: ['lazy'],
        },
      },
      qs: {
        encode: false,
      },
    });
    console.log(url);
  }

  {
    console.log('# Testing different representations of request/response');
    try {
      const axios = Axios.create({ baseURL: 'http://localhost:5000' });
      const text = 'Привет, 船員!';
      const array = [1, 5, 255];

      // @NOTE: From JS
      const jsTypedArray = Uint8Array.from(array);

      // @NOTE: From Node
      const nodeBuffer = Buffer.from(array);
      const nodeStream = Readable.from(array);

      // @NOTE: From Web
      // const webUrlSearchParams = new URLSearchParams({ name: 'Helga' }); // @WIP
      const webBlob = new Blob([jsTypedArray]);
      const webStream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(jsTypedArray);
          c.close();
        },
      });
      const webFile = new File([jsTypedArray], 'bytes.bin');
      const webFormData = new FormData();
      webFormData.append('file', webFile);

      // const body = text;
      // const body = array;
      // const body = jsTypedArray;
      // const body = jsTypedArray.buffer;
      const body = nodeBuffer;
      // const body = nodeStream;
      // const body = webBlob;
      // const body = webStream;
      // const body = webFile;
      // const body = webFormData;

      const {
        headers: { 'content-type': contentType },
        data,
      } = await axios.post('/echo', body, {
        // responseType: 'arraybuffer', // @NOTE: Actually produces Buffer instead of ArrayBuffer :|
        // responseType: 'blob', // @NOTE: in Node is the same as 'text'
        // responseType: 'document', // @NOTE: in Node is the same as 'text'
        // responseType: 'json', // @NOTE: does not work without transformResponse
        // responseType: 'stream', // @NOTE: NodeStream in Node, does not work in Web, but WebStream can be acquired from Blob
        // responseType: 'text', // @NOTE: unreliable, will still try to parse as json because of transformResponse
        headers: {
          // 'content-type': 'text/plain',
          // 'content-type': 'application/json',
          // 'content-type': 'multipart/form-data',
          // 'content-type': 'application/x-www-form-urlencoded',
          // 'content-type': 'application/octet-stream',
        },
        transformRequest: (req, headers) => {
          console.log('@DEBUG: transformRequest', headers);
          // return axios.defaults.transformRequest?.[0]?.(req, headers);
          return req;
        },
        transformResponse: (res, headers) => {
          console.log('@DEBUG: transformResponse', headers);
          // return axios.defaults.transformResponse?.[0]?.(res, headers);
          return res;
        },
      });
      console.log('Request:', inspect(body, { depth: 0 }), typeof body);
      console.log('Response:', inspect(data, { depth: 0 }), typeof data, contentType);

      if (data instanceof Readable) {
        const dataBuffer = await new Promise((resolve, reject) => {
          const buffers: Buffer[] = [];
          data.on('data', (chunk) => {
            buffers.push(chunk);
          });
          data.on('end', () => {
            const buffer = Buffer.concat(buffers);
            resolve(buffer);
          });
          data.on('error', (err) => {
            reject(err);
          });
        });
        console.log('Response (buffered):', dataBuffer);
      }
    } catch (err) {
      console.error(err.message);
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// @SECTION: Utils

function bytesFromSparseHex(sparseHex: string): Uint8Array {
  const validationRe = /^[0-9a-f\s]*$/;
  const valid = validationRe.test(sparseHex);
  if (!valid) throw new Error('Invalid hex string, can only contain hex characters and whitespaces');
  const denseHex = sparseHex.replace(/\s+/g, '');
  if (denseHex.length % 2 !== 0) throw new Error('Invalid hex string, has to be even length');
  const sizeInBytes = denseHex.length / 2;
  const buffer = new Uint8Array(sizeInBytes);
  for (let idx = 0; idx < sizeInBytes; idx += 1) {
    buffer[idx] = parseInt(denseHex.slice(idx * 2, idx * 2 + 2), 16);
  }
  return buffer;
}
