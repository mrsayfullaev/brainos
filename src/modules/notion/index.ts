/**
 * V4 Notion Integration
 */

export {
  getNotionConnection,
  setNotionConnection,
  disconnectNotion,
  updateLastSync,
  getAllNotionUserIds,
  getNotionLinkedDatabases,
  addNotionLinkedDatabase,
  removeNotionLinkedDatabase,
} from './queries';
export type { NotionLinkedDbType } from './queries';
export {
  isNotionOAuthConfigured,
  getNotionOAuthUrl,
  handleNotionOAuthCallback,
} from './oauth';
export {
  syncTasksToNotion,
  syncNotesToNotion,
  syncTasksFromNotion,
  syncNotesFromNotion,
  syncFromNotion,
  runSyncForUser,
  runNotionSyncCron,
} from './sync';
