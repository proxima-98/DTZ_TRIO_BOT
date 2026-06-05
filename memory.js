/**
 * DTZ-Bot — Conversation Memory Manager
 * Stores per-user conversation history and metadata in memory.
 * Keeps memory clear by automatically purging inactive sessions.
 */

const MAX_MESSAGES = 30; // ~15 exchanges kept per user
const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours

// Combined store to prevent desynced records and memory leaks
// Structure: Map<chatId, { history: Array, meta: Object, lastSeen: number }>
const sessions = new Map();

function getOrCreateSession(chatId) {
  const idStr = String(chatId);
  if (!sessions.has(idStr)) {
    sessions.set(idStr, {
      history: [],
      meta: {},
      lastSeen: Date.now()
    });
  }
  return sessions.get(idStr);
}

function getConversationHistory(chatId) {
  return getOrCreateSession(chatId).history;
}

function logConversation(chatId, history) {
  const session = getOrCreateSession(chatId);
  
  // Keep last MAX_MESSAGES to stay within token limits
  session.history = history.slice(-MAX_MESSAGES);
  
  // Automatically update lastSeen whenever a user interacts
  session.lastSeen = Date.now();
}

function clearHistory(chatId) {
  const session = sessions.get(String(chatId));
  if (session) {
    session.history = [];
  }
}

function setUserMeta(chatId, meta) {
  const session = getOrCreateSession(chatId);
  session.meta = { ...session.meta, ...meta }; // Merge metadata
  session.lastSeen = Date.now(); // Heartbeat update
}

function getUserMeta(chatId) {
  return getOrCreateSession(chatId).meta;
}

function deleteSession(chatId) {
  sessions.delete(String(chatId));
}

// Clean up completely inactive sessions every hour
setInterval(() => {
  const cutoff = Date.now() - INACTIVITY_TIMEOUT;
  for (const [key, session] of sessions) {
    if (session.lastSeen < cutoff) {
      sessions.delete(key); // Safely clears history AND metadata at once
    }
  }
}, 60 * 60 * 1000);

module.exports = { 
  getConversationHistory, 
  logConversation, 
  clearHistory, 
  setUserMeta, 
  getUserMeta,
  deleteSession 
};
