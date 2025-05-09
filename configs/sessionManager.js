// sessionManager.js
const { v4: uuidv4 } = require('uuid');

const sessions = new Map(); // key: userId, value: Set of sessionIds

/**
 * Creates and stores a new session for a user.
 * @param {string} userId - Unique identifier for the user.
 * @returns {string} sessionId - The newly created session ID.
 */
function createSession(userId) {
  const sessionId = `${userId}-${uuidv4()}`;
  if (!sessions.has(userId)) {
    sessions.set(userId, new Set());
  }
  sessions.get(userId).add(sessionId);
  return sessionId;
}

/**
 * Checks if the given sessionId is valid for a user.
 * @param {string} userId - The user ID.
 * @param {string} sessionId - The session ID to validate.
 * @returns {boolean} Whether the session is valid.
 */
function isValidSession(userId, sessionId) {
  return sessions.has(userId) && sessions.get(userId).has(sessionId);
}

/**
 * Clears a specific session for a user.
 * @param {string} userId - The user ID.
 * @param {string} sessionId - The session ID to remove.
 */
function clearSession(userId, sessionId) {
  if (sessions.has(userId)) {
    sessions.get(userId).delete(sessionId);
    if (sessions.get(userId).size === 0) {
      sessions.delete(userId); // Clean up if no sessions left
    }
  }
}

/**
 * Clears all sessions for a user.
 * @param {string} userId - The user ID.
 */
function clearAllUserSessions(userId) {
  sessions.delete(userId);
}

/**
 * Clears all sessions for all users (e.g., on bot restart).
 */
function clearAllSessions() {
  sessions.clear();
}

module.exports = {
  createSession,
  isValidSession,
  clearSession,
  clearAllUserSessions,
  clearAllSessions,
};
