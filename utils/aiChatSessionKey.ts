const AI_CHAT_SESSION_STORAGE_KEY = 'ai_chat_session_key';

/** Clé de session chatbot — une par onglet, pour quotas IA. */
export function getAiChatSessionKey(): string {
  let key = sessionStorage.getItem(AI_CHAT_SESSION_STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(AI_CHAT_SESSION_STORAGE_KEY, key);
  }
  return key;
}
