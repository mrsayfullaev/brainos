/**
 * V4 Email Agent (inbox)
 */

export {
  getEmailAccount,
  setEmailAccount,
  disconnectEmail,
  getThreads,
  saveThread,
  updateThreadTriage,
  updateTriageBulk,
} from './queries';
export { isGmailOAuthConfigured, getGmailOAuthUrl, handleGmailOAuthCallback } from './oauth';
export { triageThreads, runTriageForAccount } from './triage';
export type { ThreadForTriage } from './triage';
export { fetchInbox } from './fetch';
