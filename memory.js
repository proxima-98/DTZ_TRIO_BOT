/**
 * DTZ-Bot — Conversation Memory Manager
 * Stores per-user conversation history in memory.
 * For production scale, replace with Redis or MongoDB.
 */

const MAX_MESSAGES = 30; // ~15 exchanges kept per user

const store = new Map();
const userMeta = new Map(); // track user info

function getConversationHistory(chatId) {
  return store.get(String(chatId)) || [];
}

function logConversation(chatId, history) {
  // Keep last MAX_MESSAGES to stay within token limits
  const trimmed = history.slice(-MAX_MESSAGES);
  store.set(String(chatId), trimmed);
}

function clearHistory(chatId) {
  store.delete(String(chatId));
}

function setUserMeta(chatId, meta) {
  userMeta.set(String(chatId), meta);
}

function getUserMeta(chatId) {
  return userMeta.get(String(chatId)) || {};
}

// Clean up old conversations every hour (memory management)
setInterval(() => {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000; // 3 hours
  for (const [key] of store) {
    const meta = userMeta.get(key);
    if (meta && meta.lastSeen && meta.lastSeen < cutoff) {
      store.delete(key);
    }
  }
}, 60 * 60 * 1000);

module.exports = { getConversationHistory, logConversation, clearHistory, setUserMeta, getUserMeta };
