const { extname } = require('path');
const fs = require('fs');
const debug = require('debug')('@ladjs/koa-better-static:send');

module.exports = send;

/**
 * Send file at `path` with the
 * given `options` to the koa `ctx`.
 *
 * @param {Context} ctx
 * @param {String} root
 * @param {String} path
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function stat(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

async function send(ctx, path, opts) {
  if (typeof ctx !== 'object') throw new Error('`ctx` is required');
  if (typeof path !== 'string') throw new Error('`path` is required');
  if (typeof opts !== 'object') throw new Error('`opts` is required');

  // Options
  debug('send "%s" %j', path, opts);
  const { index, maxage, format, ifModifiedSinceSupport } = opts;

  // Stat
  let stats;
  try {
    stats = await stat(path);
  } catch (err) {
    const notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
    if (notfound.indexOf(err.code) !== -1) {
      return;
    }
    err.status = 500;
    throw err;
  }

  // Format the path to serve static file servers
  // and not require a trailing slash for directories,
  // so that you can do both `/directory` and `/directory/`
  if (stats.isDirectory()) {
    if (format && index) {
      path += '/' + index;
      stats = await stat(path);
    } else {
      return;
    }
  }

  ctx.set('Cache-Control', 'max-age=' + ((maxage / 1000) | 0));

  // Check if we can return a cache hit
  if (ifModifiedSinceSupport) {
    const ims = ctx.get('If-Modified-Since');

    const ms = Date.parse(ims);

    if (
      ms &&
      Math.floor(ms / 1000) === Math.floor(stats.mtime.getTime() / 1000)
    ) {
      ctx.status = 304; // Not modified
      return path;
    }
  }

  // Stream
  ctx.set('Last-Modified', stats.mtime.toUTCString());
  ctx.set('Content-Length', stats.size);
  ctx.type = extname(path);
  ctx.body = fs.createReadStream(path);

  return path;
}
