const DEEPSEEK_TIMEOUT_MS = 45_000;

export const deepseekChatJson = async (
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> => {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim() || '';
  if (!apiKey) {
    throw new Error('missing_deepseek_key');
  }

  const model = Deno.env.get('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: options?.maxTokens ?? 1600,
        temperature: options?.temperature ?? 0.15,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    });

    const bodyText = await res.text();

    if (!res.ok) {
      if (res.status === 429) throw new Error('deepseek_http_429');
      throw new Error(`deepseek_http_${res.status}`);
    }

    let payload: { choices?: Array<{ message?: { content?: string } }> };
    try {
      payload = JSON.parse(bodyText);
    } catch {
      throw new Error('invalid_json');
    }

    const text = payload?.choices?.[0]?.message?.content;
    if (!text?.trim()) throw new Error('empty_response');
    return text.trim();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('deepseek_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
