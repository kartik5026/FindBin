export type ApiResponse<T> = { status: 'success' | 'failure' } & T;

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';

function withBase(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path;
  return `${String(API_BASE).replace(/\/$/, '')}${path}`;
}

async function readBody(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  const text = await res.text();
  return text ? { message: text } : {};
}

export async function apiGet<T>(
  path: string,
  opts?: { token?: string }
): Promise<T> {
  const res = await fetch(withBase(path), {
    headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
  });
  const data = (await readBody(res)) as T;
  if (!res.ok) throw data;
  return data as T;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts?: { token?: string }
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(withBase(path), {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await readBody(res)) as T;
  if (!res.ok) throw data;
  return data as T;
}


