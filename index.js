const { normalize, resolve, parse, sep } = require('path');
const resolvePath = require('resolve-path');
const debug = require('debug')('@ladjs/koa-better-static');
const send = require('./send');

module.exports = serve;

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

  return async function(ctx, next) {
    if (ctx.method === 'HEAD' || ctx.method === 'GET') {
      let path = ctx.path.substr(parse(ctx.path).root.length);
      try {
        path = decodeURIComponent(path);
      } catch (err) {
        ctx.throw('Could not decode path', 400);
        return;
      }

      if (options.index && ctx.path[ctx.path.length - 1] === '/') {
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

// TODO: this can be sped up, with an findIndexOf loop
function isHidden(root, path) {
  path = path.substr(root.length).split(sep);
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === '.') {
      return true;
    }
  }
  return false;
}
