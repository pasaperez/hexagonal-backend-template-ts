export interface HttpModule {
    key: string;
    basePath: string;
    routes: HttpRoute[];
}

export type HttpMethod = 'DELETE' | 'GET' | 'POST' | 'PUT';

export interface HttpRequest {
    body?: unknown;
    headers: Record<string, string>;
    method: string;
    params: Record<string, string>;
    query: Record<string, unknown>;
    remoteAddress?: string;
    url: string;
}

export interface HttpResponse {
    body?: unknown;
    headers?: Record<string, string>;
    statusCode: number;
}

export interface HttpRoute {
    method: HttpMethod;
    path: string;
    handler: (request: HttpRequest) => Promise<HttpResponse>;
}

export interface ResolvedHttpRoute {
    fullPath: string;
    module: HttpModule;
    params: Record<string, string>;
    route: HttpRoute;
}

export type EndpointCatalog = Record<string, string>;

export function buildEndpointCatalog(httpModules: HttpModule[]): EndpointCatalog {
    return Object.fromEntries(httpModules.map((httpModule: HttpModule): [string, string] => [httpModule.key, httpModule.basePath]));
}

export function joinHttpPaths(basePath: string, routePath: string): string {
    const normalizedBasePath: string = normalizeHttpPath(basePath);
    const normalizedRoutePath: string = normalizeHttpPath(routePath);
    if (normalizedRoutePath === '/') {
        return normalizedBasePath;
    }

    return normalizedBasePath === '/' ? normalizedRoutePath : `${normalizedBasePath}${normalizedRoutePath}`;
}

export function normalizeHttpPath(path: string): string {
    if (path.length === 0 || path === '/') {
        return '/';
    }

    const normalizedPath: string = path.startsWith('/') ? path : `/${path}`;
    return normalizedPath.length > 1 && normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;
}

export function matchHttpPath(pattern: string, pathname: string): Record<string, string> | null {
    const patternSegments: string[] = splitHttpPath(pattern);
    const pathnameSegments: string[] = splitHttpPath(pathname);
    if (patternSegments.length !== pathnameSegments.length) {
        return null;
    }

    const params: Record<string, string> = {};

    for (let index: number = 0; index < patternSegments.length; index += 1) {
        const patternSegment: string = patternSegments[index]!;
        const pathnameSegment: string = pathnameSegments[index]!;

        if (patternSegment.startsWith(':')) {
            params[patternSegment.slice(1)] = decodeURIComponent(pathnameSegment);
            continue;
        }

        if (patternSegment !== pathnameSegment) {
            return null;
        }
    }

    return params;
}

export function resolveHttpRoute(httpModules: HttpModule[], method: string, pathname: string): ResolvedHttpRoute | null {
    const normalizedMethod: string = method.toUpperCase();
    const normalizedPathname: string = normalizeHttpPath(pathname);

    for (const httpModule of httpModules) {
        for (const route of httpModule.routes) {
            if (route.method !== normalizedMethod) {
                continue;
            }

            const fullPath: string = joinHttpPaths(httpModule.basePath, route.path);
            const params: Record<string, string> | null = matchHttpPath(fullPath, normalizedPathname);
            if (params) {
                return { fullPath, module: httpModule, params, route };
            }
        }
    }

    return null;
}

function splitHttpPath(path: string): string[] {
    const normalizedPath: string = normalizeHttpPath(path);
    return normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/');
}
