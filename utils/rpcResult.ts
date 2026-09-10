/** Interprète le jsonb `{ success, error?, ... }` renvoyé par les RPC Supabase. */
export function assertRpcSuccess(
  data: unknown,
  fallbackMessage = 'Opération refusée par le serveur.',
): asserts data is Record<string, unknown> & { success: true } {
  if (!data || typeof data !== 'object') {
    throw new Error(fallbackMessage);
  }
  const payload = data as { success?: boolean; error?: unknown };
  if (payload.success) return;
  const message =
    typeof payload.error === 'string' && payload.error.trim()
      ? payload.error
      : fallbackMessage;
  throw new Error(message);
}
