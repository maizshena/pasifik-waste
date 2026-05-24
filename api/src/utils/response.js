// src/utils/response.js
'use strict';

function success(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  const body = { success: false, message };
  if (details && process.env.NODE_ENV !== 'production') body.details = details;
  return res.status(statusCode).json(body);
}

function paginate(res, data = [], meta = {}) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page:       meta.page  || 1,
      limit:      meta.limit || 20,
      total:      meta.total || 0,
      totalPages: Math.ceil((meta.total || 0) / (meta.limit || 20)),
    },
  });
}

module.exports = { success, error, paginate };