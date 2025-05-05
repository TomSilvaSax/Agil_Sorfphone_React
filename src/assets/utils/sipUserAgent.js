// sipUserAgent.js
let userAgent = null;

export function setUserAgent(ua) {
  userAgent = ua;
}

export function getUserAgent() {
  return userAgent;
}
