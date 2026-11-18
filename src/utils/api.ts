export class ApiRequestError extends Error {
  status: number;
  isHtmlResponse: boolean;

  constructor(message: string, status = 0, isHtmlResponse = false) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.isHtmlResponse = isHtmlResponse;
  }
}

export async function fetchJsonSafe<T>(
  url: string,
  init?: RequestInit,
  language: 'es' | 'en' = 'es'
): Promise<T> {
  const isEs = language === 'es';
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    console.error('[AURA SCANNER] Network failure calling', url, err);
    throw new ApiRequestError(
      isEs
        ? 'No se pudo conectar con el servidor de AURA SCANNER. Verifica tu conexión e inténtalo nuevamente.'
        : 'Could not connect to the AURA SCANNER server. Check your connection and try again.'
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();
  const trimmed = rawText.trimStart().toLowerCase();
  const looksLikeHtml =
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<pre') ||
    contentType.includes('text/html');

  if (looksLikeHtml) {
    console.error('[AURA SCANNER] Expected JSON but server returned HTML:', {
      url,
      status: response.status,
      contentType,
      preview: rawText.slice(0, 220),
    });
    throw new ApiRequestError(
      isEs
        ? `El servidor devolvió una página HTML (HTTP ${response.status}) en lugar de JSON al llamar a ${url}. Verifica que el backend server.ts esté activo.`
        : `Server returned HTML (HTTP ${response.status}) instead of JSON when calling ${url}. Ensure backend server.ts is active.`,
      response.status,
      true
    );
  }

  if (!contentType.includes('application/json') && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    console.error('[AURA SCANNER] Unexpected non-JSON Content-Type:', {
      url,
      status: response.status,
      contentType,
      preview: rawText.slice(0, 220),
    });
    throw new ApiRequestError(
      isEs
        ? `Respuesta inesperada del servidor (HTTP ${response.status}, tipo: ${contentType || 'desconocido'}).`
        : `Unexpected server response (HTTP ${response.status}, type: ${contentType || 'unknown'}).`,
      response.status
    );
  }

  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch (parseErr) {
    console.error('[AURA SCANNER] Invalid JSON payload from', url, {
      status: response.status,
      preview: rawText.slice(0, 220),
      parseErr,
    });
    throw new ApiRequestError(
      isEs
        ? `El servidor devolvió un JSON inválido (HTTP ${response.status}).`
        : `Server returned invalid JSON (HTTP ${response.status}).`,
      response.status
    );
  }

  if (!response.ok) {
    const serverMessage =
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : isEs
        ? `Error del servidor (HTTP ${response.status}).`
        : `Server error (HTTP ${response.status}).`;

    throw new ApiRequestError(serverMessage, response.status);
  }

  return parsed as T;
}
