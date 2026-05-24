'use strict';

const { pool } = require('../config/db');

/**
 * Create notification for specific users or all admins
 * @param {object} opts
 * @param {number[]|'admins'} opts.recipients  - array of user IDs or 'admins'
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} [opts.link]
 */
async function notify({ recipients, type, title, body, link = null }) {
  try {
    let userIds = [];

    if (recipients === 'admins') {
      const [admins] = await pool.query(
        `SELECT id FROM users
         WHERE role IN ('admin','super_admin')
         AND is_active = 1 AND deleted_at IS NULL`
      );
      userIds = admins.map((a) => a.id);
    } else {
      userIds = recipients;
    }

    if (userIds.length === 0) return;

    const values = userIds.map((uid) => [uid, type, title, body, link]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ?`,
      [values]
    );
  } catch (err) {
    // Notifications are non-critical — log but don't throw
    console.error('[NOTIFY ERROR]', err.message);
  }
}

module.exports = { notify };