const models = require('../models');

function receiverFromReq(req) {
  const receiver_type = req.user?.userType;
  const receiver_id = req.user?.id;
  if (!receiver_type || !receiver_id) return null;
  if (receiver_type !== 'student' && receiver_type !== 'lecturer') return null;
  return { receiver_type, receiver_id };
}

async function listMyNotifications(req, res) {
  try {
    const receiver = receiverFromReq(req);
    if (!receiver) return res.status(403).json({ error: 'access denied' });

    const limit = Math.min(parseInt(req.query.limit || '30', 10) || 30, 100);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);

    const { rows, count } = await models.Notification.findAndCountAll({
      where: {
        noti_receiver_type: receiver.receiver_type,
        noti_receiver_id: receiver.receiver_id,
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ notifications: rows, total: count, limit, offset });
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}

async function getMyUnreadCount(req, res) {
  try {
    const receiver = receiverFromReq(req);
    if (!receiver) return res.status(403).json({ error: 'access denied' });

    const count = await models.Notification.count({
      where: {
        noti_receiver_type: receiver.receiver_type,
        noti_receiver_id: receiver.receiver_id,
        is_read: false,
      },
    });

    res.json({ unread: count });
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}

async function markRead(req, res) {
  try {
    const receiver = receiverFromReq(req);
    if (!receiver) return res.status(403).json({ error: 'access denied' });

    const { noti_ids, all } = req.body || {};
    const where = {
      noti_receiver_type: receiver.receiver_type,
      noti_receiver_id: receiver.receiver_id,
      is_read: false,
    };

    if (!all) {
      if (!Array.isArray(noti_ids) || noti_ids.length === 0) {
        return res.status(400).json({ error: 'Provide noti_ids[] or { all: true }' });
      }
      where.noti_id = noti_ids;
    }

    const [updated] = await models.Notification.update(
      { is_read: true, read_at: new Date() },
      { where }
    );

    res.json({ updated });
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}

module.exports = {
  listMyNotifications,
  getMyUnreadCount,
  markRead,
};

