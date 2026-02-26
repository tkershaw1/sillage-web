/**
 * /api/ranking?id=:rankingId
 * Rankings ("lists") are implemented as collections with collection_type='list'.
 * This endpoint is an alias for /api/collection.
 */

const collectionHandler = require('./collection');

module.exports = async function handler(req, res) {
  return collectionHandler(req, res);
};
