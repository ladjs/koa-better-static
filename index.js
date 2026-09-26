const { normalize, resolve, parse, sep } = require('node:path');
const resolvePath = require('resolve-path');
const debug = require('debug')('@ladjs/koa-better-static');
const send = require('./send');

module.exports = serve;

// Percent-encoded RFC 3986 unreserved characters (ALPHA / DIGIT / "-" / "." /
// "_" / "~"). These never need to be encoded, so a request that encodes them
// (e.g. `/%64eep/secret.txt`) is an alias of another URL.
const ENCODED_UNRESERVED =
  /%(?:3\d|4[1-9a-f]|5[\da]|6[1-9a-f]|7[\da]|2[de]|5f|7e)/i;

/**
 * Check whether the raw request path is the one canonical URL for the file
 * it resolves to. Non-canonical paths (dot segments, empty segments, encoded
 * separators, encoded unreserved characters) would otherwise be normalized by
 * `resolve-path` and served, letting them slip past upstream path-based
 * guards that compare against `ctx.path` (e.g. `/foo/../deep/secret.txt`).
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

function isCanonicalPath(path) {
  if (ENCODED_UNRESERVED.test(path)) return false;

  const segments = path.split('/');

  // skip the leading empty segment; allow a single trailing empty segment
  // (directory request, e.g. `/docs/`)
  for (let i = 1; i < segments.length; i++) {
    let segment = segments[i];

    if (segment === '') {
      if (i === segments.length - 1) continue;
      return false;
    }

    try {
      segment = decodeURIComponent(segment);
    } catch {
      // decoding is validated (400) by the middleware below
      continue;
    }

    if (segment === '.' || segment === '..') return false;
    if (segment.includes('/') || segment.includes('\\')) return false;
  }

  return true;
}

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function serve(root, opts = {}) {
  if (typeof root !== 'string') throw new Error('`root` argument missing');

  if (opts.maxAge) {
    opts.maxage = opts.maxAge;
    delete opts.maxAge;
  }

  const options = {
    index: false,
    maxage: 0,
    hidden: false,
    ifModifiedSinceSupport: true,
    ...opts
  };

  const normalizedRoot = normalize(resolve(root));

  // Options
  debug('static "%s" %j', root, opts);

  return async function (ctx, next) {
    if (
      (ctx.method === 'HEAD' || ctx.method === 'GET') &&
      isCanonicalPath(ctx.path)
    ) {
      let path = ctx.path.slice(parse(ctx.path).root.length);
      try {
        path = decodeURIComponent(path);
      } catch {
        ctx.throw('Could not decode path', 400);
        return;
      }

      if (options.index && ctx.path.at(-1) === '/') {
        path += options.index;
      }

      path = resolvePath(normalizedRoot, path);

      if (!options.hidden && isHidden(root, path)) {
        return;
      }

      if (await send(ctx, path, options)) {
        return;
      }
    }

    return next();
  };
}

function isHidden(root, path) {
  path = path.slice(root.length).split(sep);
  // optimized with `findIndex`
  /*
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === '.') {
      return true;
    }
  }
  return false;
  */
  return path.findIndex((segment) => segment[0] === '.') !== -1;
}
