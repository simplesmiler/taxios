import { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import qs from 'qs';
import { ConditionalKeys, Opaque } from 'type-fest';

import { interpolateParams } from './interpolate-params';

// @NOTE: [never] instead of never, see https://github.com/microsoft/TypeScript/issues/23182#issuecomment-379091887
type EverOr<A, B> = [A] extends [never] ? B : A;

type IsRequired<T> = undefined extends T ? false : true;

type RequiredProperties<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type HasRequiredProperties<T> = RequiredProperties<T> extends never ? false : true;

// === //

// @NOTE: Mostly follows OpenAPI and Axios supported methods
// @TODO: What about TRACE? It is supported by OpenAPI, but not by Axios
type Method = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';

// @NOTE: Mostly follows OpenAPI names for these things
type Field = 'query' | 'params' | 'body' | 'response';

// @NOTE: Follows Axios signatures
// @TODO: What about TRACE? It is supported by OpenAPI, but not by Axios
type HasBody<TMethod extends Method> = TMethod extends 'GET' | 'HEAD' | 'DELETE' | 'OPTIONS' ? false : true;

type Scheme = {
  version: '1';
  routes: {
    [route in string]: {
      [method in Method]?: {
        [field in Field]?: unknown;
      };
    };
  };
};

type AvailableRoutes<TApi extends Scheme, TMethod extends Method> = ConditionalKeys<
  TApi['routes'],
  { [method in TMethod]: unknown }
>;

type FieldLut<
  TApi extends Scheme,
  TMethod extends Method,
  TRoute extends AvailableRoutes<TApi, TMethod>,
  TField extends Field
> = TRoute extends keyof TApi['routes']
  ? TMethod extends keyof TApi['routes'][TRoute]
    ? TField extends keyof TApi['routes'][TRoute][TMethod]
      ? TApi['routes'][TRoute][TMethod][TField]
      : never
    : never
  : never;

type RouteLut<
  TApi extends Scheme,
  TMethod extends Method,
  TRoute extends AvailableRoutes<TApi, TMethod>
> = TRoute extends keyof TApi['routes']
  ? TMethod extends keyof TApi['routes'][TRoute]
    ? TApi['routes'][TRoute][TMethod]
    : never
  : never;

export type Config<TApi extends Scheme, TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>> = EverOr<
  Pick<RouteLut<TApi, TMethod, TRoute>, keyof RouteLut<TApi, TMethod, TRoute> & ('params' | 'query')>,
  undefined
>;

export type Body<TApi extends Scheme, TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>> = EverOr<
  FieldLut<TApi, TMethod, TRoute, 'body'>,
  undefined
>;

export type Response<
  TApi extends Scheme,
  TMethod extends Method,
  TRoute extends AvailableRoutes<TApi, TMethod>
> = EverOr<FieldLut<TApi, TMethod, TRoute, 'response'>, undefined>;

type Url<TApi extends Scheme, TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>> = Opaque<
  string,
  [TApi, TMethod, TRoute]
>;

type LaxConfig = {
  params?: { [key in string]: any };
  query?: { [key in string]: any };
};

type RequestConfig<TApi extends Scheme, TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>> = Config<
  TApi,
  TMethod,
  TRoute
> & { axios?: AxiosRequestConfig };

type LaxRequestConfig = LaxConfig & { axios?: AxiosRequestConfig };

type RequestArgs<TApi extends Scheme, TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>> = HasBody<
  TMethod
> extends true
  ? HasRequiredProperties<Config<TApi, TMethod, TRoute>> extends true
    ? Parameters<(body: Body<TApi, TMethod, TRoute>, config: RequestConfig<TApi, TMethod, TRoute>) => void>
    : IsRequired<Body<TApi, TMethod, TRoute>> extends true
    ? Parameters<(body: Body<TApi, TMethod, TRoute>, config?: RequestConfig<TApi, TMethod, TRoute>) => void>
    : Parameters<(body?: Body<TApi, TMethod, TRoute>, config?: RequestConfig<TApi, TMethod, TRoute>) => void>
  : HasRequiredProperties<Config<TApi, TMethod, TRoute>> extends true
  ? Parameters<(config: RequestConfig<TApi, TMethod, TRoute>) => void>
  : Parameters<(config?: RequestConfig<TApi, TMethod, TRoute>) => void>;

type LaxRequestArgs<TMethod extends Method> = HasBody<TMethod> extends true
  ? Parameters<(body?: any, config?: LaxRequestConfig) => void>
  : Parameters<(config?: LaxRequestConfig) => void>;

type InferredRequestArgs<
  TApi extends Scheme,
  TMethod extends Method,
  TRoute extends AvailableRoutes<TApi, TMethod>,
  TStrict extends boolean
> = TStrict extends true ? RequestArgs<TApi, TMethod, TRoute> : LaxRequestArgs<TMethod>;

type UrlArgs<
  TApi extends Scheme,
  TMethod extends Method,
  TRoute extends AvailableRoutes<TApi, TMethod>
> = HasRequiredProperties<Config<TApi, TMethod, TRoute>> extends true
  ? Parameters<(config: Config<TApi, TMethod, TRoute>) => void>
  : Parameters<(config?: Config<TApi, TMethod, TRoute>) => void>;

type LaxUrlArgs<TMethod extends Method> = Parameters<(config?: LaxConfig) => void>;

type InferredUrlArgs<
  TApi extends Scheme,
  TMethod extends Method,
  TRoute extends AvailableRoutes<TApi, TMethod>,
  TStrict extends boolean
> = TStrict extends true ? UrlArgs<TApi, TMethod, TRoute> : LaxUrlArgs<TMethod>;

export class Taxios<TApi extends Scheme, TStrict extends boolean = true> {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  get unsafe(): Taxios<TApi, false> {
    return this;
  }

  // @TODO: Cover with tests
  // @TODO: https://swagger.io/docs/specification/serialization/
  url<TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>>(
    _method: TMethod,
    route: TRoute,
    ...args: InferredUrlArgs<TApi, TMethod, TRoute, TStrict>
  ): Url<TApi, TMethod, TRoute> {
    let url = route as string;
    //
    const [config] = args;
    const rawConfig = config as any;
    if (rawConfig) {
      const rawParams = rawConfig.params;
      if (rawParams) {
        url = interpolateParams(url, rawParams);
      }
      const rawQuery = rawConfig.query;
      if (rawQuery) {
        url += qs.stringify(rawQuery);
      }
    }
    return url as Opaque<string, [TApi, TMethod, TRoute]>;
  }

  async get<TRoute extends AvailableRoutes<TApi, 'GET'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'GET', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'GET', TRoute>>> {
    const [config] = args;
    const url = this.url('GET', route, ...([config] as any));
    return await this.axios.get(url, config ? config.axios : {});
  }

  async $get<TRoute extends AvailableRoutes<TApi, 'GET'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'GET', TRoute, TStrict>
  ): Promise<Response<TApi, 'GET', TRoute>> {
    const [config] = args;

    const url = this.url('GET', route, ...([config] as any));
    return await this.axios.get(url, config ? config.axios : {}).then((response) => response.data);
  }

  async head<TRoute extends AvailableRoutes<TApi, 'HEAD'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'HEAD', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'HEAD', TRoute>>> {
    const [config] = args;
    const url = this.url('HEAD', route, ...([config] as any));
    return await this.axios.head(url, config ? config.axios : {});
  }

  async $head<TRoute extends AvailableRoutes<TApi, 'HEAD'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'HEAD', TRoute, TStrict>
  ): Promise<Response<TApi, 'HEAD', TRoute>> {
    const [config] = args;
    const url = this.url('HEAD', route, ...([config] as any));
    return await this.axios.head(url, config ? config.axios : {}).then((response) => response.data);
  }

  async post<TRoute extends AvailableRoutes<TApi, 'POST'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'POST', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'POST', TRoute>>> {
    const [body, config] = args;
    const url = this.url('POST', route, ...([config] as any));
    return await this.axios.post(url, body, config ? config.axios : {});
  }

  async $post<TRoute extends AvailableRoutes<TApi, 'POST'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'POST', TRoute, TStrict>
  ): Promise<Response<TApi, 'POST', TRoute>> {
    const [body, config] = args;
    const url = this.url('POST', route, ...([config] as any));
    return await this.axios.post(url, body, config ? config.axios : {}).then((response) => response.data);
  }

  async put<TRoute extends AvailableRoutes<TApi, 'PUT'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'PUT', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'PUT', TRoute>>> {
    const [body, config] = args;
    const url = this.url('PUT', route, ...([config] as any));
    return await this.axios.put(url, body, config ? config.axios : {});
  }

  async $put<TRoute extends AvailableRoutes<TApi, 'PUT'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'PUT', TRoute, TStrict>
  ): Promise<Response<TApi, 'PUT', TRoute>> {
    const [body, config] = args;
    const url = this.url('PUT', route, ...([config] as any));
    return await this.axios.put(url, body, config ? config.axios : {}).then((response) => response.data);
  }

  async delete<TRoute extends AvailableRoutes<TApi, 'DELETE'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'DELETE', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'DELETE', TRoute>>> {
    const [config] = args;
    const url = this.url('DELETE', route, ...([config] as any));
    return await this.axios.delete(url, config ? config.axios : {});
  }

  async $delete<TRoute extends AvailableRoutes<TApi, 'DELETE'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'DELETE', TRoute, TStrict>
  ): Promise<Response<TApi, 'DELETE', TRoute>> {
    const [config] = args;
    const url = this.url('DELETE', route, ...([config] as any));
    return await this.axios.delete(url, config ? config.axios : {}).then((response) => response.data);
  }

  async options<TRoute extends AvailableRoutes<TApi, 'OPTIONS'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'OPTIONS', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'OPTIONS', TRoute>>> {
    const [config] = args;
    const url = this.url('OPTIONS', route, ...([config] as any));
    return await this.axios.options(url, config ? config.axios : {});
  }

  async $options<TRoute extends AvailableRoutes<TApi, 'OPTIONS'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'OPTIONS', TRoute, TStrict>
  ): Promise<Response<TApi, 'OPTIONS', TRoute>> {
    const [config] = args;
    const url = this.url('OPTIONS', route, ...([config] as any));
    return await this.axios.options(url, config ? config.axios : {}).then((response) => response.data);
  }

  async patch<TRoute extends AvailableRoutes<TApi, 'PATCH'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'PATCH', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'PATCH', TRoute>>> {
    const [body, config] = args;
    const url = this.url('PATCH', route, ...([config] as any));
    return await this.axios.patch(url, body, config ? config.axios : {});
  }

  async $patch<TRoute extends AvailableRoutes<TApi, 'PATCH'>>(
    route: TRoute,
    ...args: InferredRequestArgs<TApi, 'PATCH', TRoute, TStrict>
  ): Promise<Response<TApi, 'PATCH', TRoute>> {
    const [body, config] = args;
    const url = this.url('PATCH', route, ...([config] as any));
    return await this.axios.patch(url, body, config ? config.axios : {}).then((response) => response.data);
  }
}
