export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function apiRequest<T>(
  url: string,
  method: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error?.message || "Não foi possível concluir a solicitação.",
      response.status,
      result.error?.code || "UNKNOWN",
      result.error?.fields || {},
    );
  return result.data;
}
export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.";
}
