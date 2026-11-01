/**
 * Safe API request helper to prevent JSON parsing crashes
 * Enforces response.ok and Content-Type validation
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  rawText?: string;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkErr: any) {
    throw new Error(`Network connection error: ${networkErr.message || 'Server unreachable'}`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');

  // Handle non-OK status codes (4xx, 5xx)
  if (!response.ok) {
    let errorDetail = '';

    if (isJson) {
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.error || errorJson.message || `Error ${response.status}`;
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
    } else {
      try {
        const rawText = await response.text();
        // Clean HTML tags if present to extract readable error
        const cleanSnippet = rawText
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160);
        errorDetail = cleanSnippet || `HTTP ${response.status} ${response.statusText}`;
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
    }

    throw new Error(`API Error (${response.status}): ${errorDetail}`);
  }

  // Handle successful response that is NOT JSON
  if (!isJson) {
    const rawText = await response.text();
    const cleanSnippet = rawText
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    throw new Error(
      `Invalid server response (Expected JSON, received ${contentType || 'text'}): "${cleanSnippet || 'HTML page'}"`
    );
  }

  // Parse JSON safely
  try {
    const data = await response.json();
    return data as T;
  } catch (parseErr: any) {
    throw new Error(`Failed to parse JSON response: ${parseErr.message}`);
  }
}
