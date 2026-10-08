import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { checkUserChanges } from '../services/sync.service.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/sync/status
 * Returns whether relevant shared data changed in another session since clientVersion
 */
router.get('/status', (req, res) => {
  const clientVersion = req.query.clientVersion || 0;
  const tabId = req.query.tabId || req.headers['x-tab-session-id'] || null;

  const result = checkUserChanges(req.user, clientVersion, tabId);

  return res.status(200).json({
    status: 'success',
    data: result,
  });
});

export default router;
