import Axios from 'axios';
import { Taxios } from '../../taxios/src';
import { PetStore } from './generated/PetStore';
import { QueryParams } from './generated/QueryParams';
import { PetStore3 } from './generated/PetStore3';
import { snake_case } from './generated/snake_case';

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
    console.log('');
  }

  {
    console.log('# Testing snake_params');
    const axios = Axios.create();
    const taxios = new Taxios<snake_case>(axios);
    const url = taxios.url('GET', '/v1/params/{snake_param}', {
      params: { snake_param: 'snake_value' },
    });
    console.log(url);
    console.log('');
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
