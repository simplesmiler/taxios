const OPTS_MARKER = Symbol('OPTS_MARKER');
const RESPONSE_MARKER = Symbol('RESPONSE_MARKER');

interface Agent {
  [OPTS_MARKER]: unknown;
  [RESPONSE_MARKER]<T>(t: T): unknown;
}

const f = () => (null as unknown as FetchAgent)[RESPONSE_MARKER](null as unknown as number);
type D = typeof f;

class Taxios<TSchema, TAgent extends Agent> {
  constructor(agent: TAgent) {
    // To implement
  }
  get(opts: TAgent[typeof OPTS_MARKER]): ReturnType<() => TAgent[typeof RESPONSE_MARKER] {
    return null as any; // To implement
  };
}

// ===

interface FetchOpts {
  fetchOption: string;
}
interface FetchResponse<T> {
  json(): T
}
class FetchAgent implements Agent {
  [OPTS_MARKER]!: FetchOpts;
  [RESPONSE_MARKER]<T>(t: T): FetchResponse<T> {
    return null as any; // To implement
  };
}

// ===

interface AxiosOpts {
  axiosOption: string;
}
interface AxiosResponse<T> {
  data: T
}
class AxiosAgent implements Agent {
  [OPTS_MARKER]!: AxiosOpts;
  [RESPONSE_MARKER]<T>(t: T): AxiosResponse<T> {
    return null as any; // To implement
  };
}

// ===

interface Schema {
  // To implement
}

{
  const agent = new FetchAgent();
  const taxios = new Taxios<Schema, typeof agent>(agent);
  const r1 = taxios.get({ fetchOption: 'asd' });
  const r2 = taxios.get({ axiosOption: 'asd' }); // Error
}

{
  const agent = new AxiosAgent();
  const taxios = new Taxios<Schema, typeof agent>(agent);
  const r1 = taxios.get({ fetchOption: 'asd' }); // Error
  const r2 = taxios.get({ axiosOption: 'asd' });
}
