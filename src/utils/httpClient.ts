const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

type CsrfTokenCache = {
  token: string | null;
  promise: Promise<string> | null;
};

const cache: CsrfTokenCache = {
  token: null,
  promise: null,
};

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method;
  }

  if (typeof Request !== 'undefined' && input instanceof Request && input.method) {
    return input.method;
  }

  if (typeof input === 'object' && 'method' in input && typeof (input as Request).method === 'string') {
    return (input as Request).method;
  }

  return 'GET';
}

function mergeHeaders(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  token?: string
): Headers {
  const headers = new Headers();

  if (typeof Request !== 'undefined' && input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers.append(key, value);
    });
  }

  if (init?.headers) {
    new Headers(init.headers as HeadersInit).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (token) {
    headers.set('X-CSRF-Token', token);
  }

  return headers;
}

async function fetchCsrfToken(originalFetch: typeof fetch): Promise<string> {
  if (cache.token) {
    return cache.token;
  }

  if (!cache.promise) {
    // dynamically import urls helper to avoid circular/static import issues in some build setups
    const { apiUrl } = await import('./urls');
    cache.promise = originalFetch(apiUrl('/api/csrf-token'), {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to retrieve CSRF token: ${response.status}`);
        }

        const data = (await response.json()) as { csrfToken?: string };
        if (!data?.csrfToken) {
          throw new Error('CSRF token missing in response');
        }

        cache.token = data.csrfToken;
        return cache.token;
      })
      .finally(() => {
        cache.promise = null;
      });
  }

  return cache.promise;
}

export function installHttpClientInterceptors(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }

  const globalWindow = window as typeof window & { __csrfFetchInstalled?: boolean };
  if (globalWindow.__csrfFetchInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const options: RequestInit = { ...init };
    const method = extractMethod(input, options).toUpperCase();

    options.credentials = options.credentials ?? 'include';

    if (!SAFE_METHODS.has(method)) {
      const token = await fetchCsrfToken(originalFetch);
      options.headers = mergeHeaders(input, options, token);
    } else if (options.headers) {
      options.headers = mergeHeaders(input, options);
    }

    try {
        // If input is a string path that starts with /api and an API base is configured, prefix it
        let fetchInput = input as RequestInfo;
        if (typeof input === 'string' && input.startsWith('/api')) {
          try {
            const { apiUrl } = await import('./urls');
            fetchInput = apiUrl(input as string);
          } catch (e) {
            // ignore and use input as-is
          }
        }

        const response = await originalFetch(fetchInput as RequestInfo, options);
      if (response.status === 403) {
        cache.token = null;
      }
      return response;
    } catch (error) {
      cache.token = null;
      throw error;
    }
  };

  window.addEventListener('focus', () => {
    cache.token = null;
  });

  globalWindow.__csrfFetchInstalled = true;
}

if (typeof window !== 'undefined') {
  installHttpClientInterceptors();
}
