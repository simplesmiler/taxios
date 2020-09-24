import { AxiosInstance, AxiosResponse, AxiosRequestConfig, ResponseType } from 'axios';
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
  Pick<RouteLut<TApi, TMethod, TRoute>, keyof RouteLut<TApi, TMethod, TRoute> & ('params' | 'query' | 'responseType')>,
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
  responseType?: ResponseType;
  axios?: AxiosRequestConfig;
};

type RequestConfig<TApi extends Scheme, TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>> = Config<
  TApi,
  TMethod,
  TRoute
> & { axios?: AxiosRequestConfig };

type LaxRequestConfig = LaxConfig & { axios?: AxiosRequestConfig };

type InferredRouteArg<TRoute, TStrict> = TStrict extends true ? TRoute : TRoute | string;

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

  url<TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>>(
    method: TMethod,
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredUrlArgs<TApi, TMethod, TRoute, TStrict>
  ): Url<TApi, TMethod, TRoute> {
    const [url] = this.prepare(method, route, ...args);
    return url;
  }

  // @TODO: Cover with tests
  // @TODO: https://swagger.io/docs/specification/serialization/
  protected prepare<TMethod extends Method, TRoute extends AvailableRoutes<TApi, TMethod>>(
    _method: TMethod,
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredUrlArgs<TApi, TMethod, TRoute, TStrict>
  ): [Url<TApi, TMethod, TRoute>, AxiosRequestConfig] {
    let urlString = route as string;
    let axiosConfig: AxiosRequestConfig = {};
    //
    const [rawConfig] = args as [LaxConfig];
    if (rawConfig) {
      const rawParams = rawConfig.params;
      if (rawParams) {
        urlString = interpolateParams(urlString, rawParams);
      }
      const rawQuery = rawConfig.query;
      if (rawQuery) {
        urlString += qs.stringify(rawQuery);
      }
      const rawAxiosConfig = rawConfig.axios;
      if (rawAxiosConfig) {
        axiosConfig = { ...rawAxiosConfig };
      }
      const rawResponseType = rawConfig.responseType;
      if (rawResponseType) {
        axiosConfig.responseType = rawResponseType;
      }
    }
    const url = urlString as Opaque<string, [TApi, TMethod, TRoute]>;
    return [url, axiosConfig];
  }

  async get<TRoute extends AvailableRoutes<TApi, 'GET'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'GET', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'GET', TRoute>>> {
    const [url, axiosConfig] = this.prepare('GET', route, ...args);
    return await this.axios.get(url, axiosConfig);
  }

  async $get<TRoute extends AvailableRoutes<TApi, 'GET'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'GET', TRoute, TStrict>
  ): Promise<Response<TApi, 'GET', TRoute>> {
    const [url, axiosConfig] = this.prepare('GET', route, ...args);
    return await this.axios.get(url, axiosConfig).then((response) => response.data);
  }

  async head<TRoute extends AvailableRoutes<TApi, 'HEAD'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'HEAD', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'HEAD', TRoute>>> {
    const [url, axiosConfig] = this.prepare('HEAD', route, ...args);
    return await this.axios.head(url, axiosConfig);
  }

  async $head<TRoute extends AvailableRoutes<TApi, 'HEAD'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'HEAD', TRoute, TStrict>
  ): Promise<Response<TApi, 'HEAD', TRoute>> {
    const [url, axiosConfig] = this.prepare('HEAD', route, ...args);
    return await this.axios.head(url, axiosConfig).then((response) => response.data);
  }

  async post<TRoute extends AvailableRoutes<TApi, 'POST'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'POST', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'POST', TRoute>>> {
    const [body, config] = args;
    const prepareArgs = [config] as InferredUrlArgs<TApi, 'POST', TRoute, TStrict>;
    const [url, axiosConfig] = this.prepare('POST', route, ...prepareArgs);
    return await this.axios.post(url, body, axiosConfig);
  }

  async $post<TRoute extends AvailableRoutes<TApi, 'POST'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'POST', TRoute, TStrict>
  ): Promise<Response<TApi, 'POST', TRoute>> {
    const [body, config] = args;
    const prepareArgs = [config] as InferredUrlArgs<TApi, 'POST', TRoute, TStrict>;
    const [url, axiosConfig] = this.prepare('POST', route, ...prepareArgs);
    return await this.axios.post(url, body, axiosConfig).then((response) => response.data);
  }

  async put<TRoute extends AvailableRoutes<TApi, 'PUT'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'PUT', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'PUT', TRoute>>> {
    const [body, config] = args;
    const prepareArgs = [config] as InferredUrlArgs<TApi, 'PUT', TRoute, TStrict>;
    const [url, axiosConfig] = this.prepare('PUT', route, ...prepareArgs);
    return await this.axios.put(url, body, axiosConfig);
  }

  async $put<TRoute extends AvailableRoutes<TApi, 'PUT'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'PUT', TRoute, TStrict>
  ): Promise<Response<TApi, 'PUT', TRoute>> {
    const [body, config] = args;
    const prepareArgs = [config] as InferredUrlArgs<TApi, 'PUT', TRoute, TStrict>;
    const [url, axiosConfig] = this.prepare('PUT', route, ...prepareArgs);
    return await this.axios.put(url, body, axiosConfig).then((response) => response.data);
  }

  async delete<TRoute extends AvailableRoutes<TApi, 'DELETE'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'DELETE', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'DELETE', TRoute>>> {
    const [url, axiosConfig] = this.prepare('DELETE', route, ...args);
    return await this.axios.delete(url, axiosConfig);
  }

  async $delete<TRoute extends AvailableRoutes<TApi, 'DELETE'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'DELETE', TRoute, TStrict>
  ): Promise<Response<TApi, 'DELETE', TRoute>> {
    const [url, axiosConfig] = this.prepare('DELETE', route, ...args);
    return await this.axios.delete(url, axiosConfig).then((response) => response.data);
  }

  async options<TRoute extends AvailableRoutes<TApi, 'OPTIONS'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'OPTIONS', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'OPTIONS', TRoute>>> {
    const [url, axiosConfig] = this.prepare('OPTIONS', route, ...args);
    return await this.axios.options(url, axiosConfig);
  }

  async $options<TRoute extends AvailableRoutes<TApi, 'OPTIONS'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'OPTIONS', TRoute, TStrict>
  ): Promise<Response<TApi, 'OPTIONS', TRoute>> {
    const [url, axiosConfig] = this.prepare('OPTIONS', route, ...args);
    return await this.axios.options(url, axiosConfig).then((response) => response.data);
  }

  async patch<TRoute extends AvailableRoutes<TApi, 'PATCH'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'PATCH', TRoute, TStrict>
  ): Promise<AxiosResponse<Response<TApi, 'PATCH', TRoute>>> {
    const [body, config] = args;
    const prepareArgs = [config] as InferredUrlArgs<TApi, 'PATCH', TRoute, TStrict>;
    const [url, axiosConfig] = this.prepare('PATCH', route, ...prepareArgs);
    return await this.axios.patch(url, body, axiosConfig);
  }

  async $patch<TRoute extends AvailableRoutes<TApi, 'PATCH'>>(
    route: InferredRouteArg<TRoute, TStrict>,
    ...args: InferredRequestArgs<TApi, 'PATCH', TRoute, TStrict>
  ): Promise<Response<TApi, 'PATCH', TRoute>> {
    const [body, config] = args;
    const prepareArgs = [config] as InferredUrlArgs<TApi, 'PATCH', TRoute, TStrict>;
    const [url, axiosConfig] = this.prepare('PATCH', route, ...prepareArgs);
    return await this.axios.patch(url, body, axiosConfig).then((response) => response.data);
  }
}
