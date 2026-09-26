const http = require('node:http');
const request = require('supertest');
const test = require('ava');
const Koa = require('koa');
const mount = require('koa-mount');
const serve = require('..');

// serve(root)
// when root = "."
test('should serve from cwd', async (t) => {
  const app = new Koa();
  app.use(serve('.'));
  const res = await request(app.listen()).get('/package.json');
  t.is(res.status, 200);
});

// when path is not a file
test('should 404', async (t) => {
  const app = new Koa();
  app.use(serve('test/fixtures'));
  const res = await request(app.listen()).get('/something');
  t.is(res.status, 404);
});

// when upstream middleware responds
test('should respond', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  app.use(async (ctx, next) => {
    await next();
    ctx.body = 'hey';
  });

  const res = await request(app.listen()).get('/hello.txt');
  t.is(res.status, 200);
  t.is(res.text, 'world');
});

// the path is valid
test('should serve the file', async (t) => {
  const app = new Koa();
  app.use(serve('test/fixtures'));
  const res = await request(app.listen()).get('/hello.txt');
  t.is(res.status, 200);
  t.is(res.text, 'world');
});

// .index
// when present
test('should alter the index file supported', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures', { index: 'index.txt' }));

  const res = await request(app.listen()).get('/');
  t.is(res.status, 200);
  t.is(res.headers['content-type'], 'text/plain; charset=utf-8');
  t.is(res.text, 'text index');
});

// when added
test('should use index.html', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures', { index: 'index.html' }));

  const res = await request(app.listen()).get('/world/');
  t.is(res.status, 200);
  t.is(res.headers['content-type'], 'text/html; charset=utf-8');
  t.is(res.text, 'html index');
});

// by default
test('should not use index.html', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen()).get('/world/');
  t.is(res.status, 404);
});

// when method is not `GET` or `HEAD`
test('when method is not GET or HEAD should 404', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen()).post('/hello.txt');
  t.is(res.status, 404);
});

// option - format'
// when format: false'
test('when format false should 404', async (t) => {
  const app = new Koa();

  app.use(
    serve('test/fixtures', {
      index: 'index.html',
      format: false
    })
  );

  const res = await request(app.listen()).get('/world');
  t.is(res.status, 404);
});

test('should 200', async (t) => {
  const app = new Koa();

  app.use(
    serve('test/fixtures', {
      index: 'index.html',
      format: false
    })
  );

  const res = await request(app.listen()).get('/world/');
  t.is(res.status, 200);
});

// when format: true
test('when format true should 200', async (t) => {
  const app = new Koa();

  app.use(
    serve('test/fixtures', {
      index: 'index.html',
      format: true
    })
  );

  const res = await request(app.listen()).get('/world');
  t.is(res.status, 200);
});

test('when format true (directory) should 200', async (t) => {
  const app = new Koa();

  app.use(
    serve('test/fixtures', {
      index: 'index.html',
      format: true
    })
  );

  const res = await request(app.listen()).get('/world/');
  t.is(res.status, 200);
});

// Support if-modified-since
test('should 304', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen()).get('/world/index.html');
  t.is(res.status, 200);
  const lastModified = res.headers['last-modified'];
  const newRes = await request(app.callback())
    .get('/world/index.html')
    .set('if-modified-since', lastModified);
  t.is(newRes.status, 304);
});

test('support if-modified-since should 200', async (t) => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen())
    .get('/world/index.html')
    .set('if-modified-since', 'Mon Jan 18 2011 23:04:34 GMT-0600');
  t.is(res.status, 200);
});

// Work with koa-mount
test('should mount fine', async (t) => {
  const app = new Koa();

  app.use(
    mount('/fixtures', serve(require('node:path').join(__dirname, '/fixtures')))
  );

  const res = await request(app.listen()).get('/fixtures/hello.txt');
  t.is(res.status, 200);
});

// This is more of a test of js, than of the logic. But something we rely on
// Dates should truncate not, round
test('dates should truncate not round, should mount fine', (t) => {
  const str = new Date().toUTCString();

  let ms = Date.parse(str);
  ms += 999; // Add 999 ms

  const nd = new Date(ms);
  t.is(nd.toUTCString(), str);
});

// non-canonical paths must not be normalized and served, otherwise they
// bypass upstream path-based guards that check `ctx.path`
// (supertest normalizes URLs, so raw requests are sent with `http.get`)
function rawGet(server, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: server.address().port, path }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

function guardedServer() {
  const app = new Koa();
  app.use((ctx, next) => {
    if (ctx.path === '/hello.txt' || ctx.path.startsWith('/world/')) {
      ctx.status = 403;
      ctx.body = 'denied';
      return;
    }

    return next();
  });
  app.use(serve('test/fixtures', { index: 'index.html' }));
  return app.listen(0);
}

test('should still enforce guards on canonical paths', async (t) => {
  const server = guardedServer();
  for (const path of ['/hello.txt', '/world/index.html', '/world/']) {
    // eslint-disable-next-line no-await-in-loop
    const res = await rawGet(server, path);
    t.is(res.status, 403);
  }

  server.close();
});

for (const path of [
  '/foo/../hello.txt',
  '/./hello.txt',
  '/%2e/hello.txt',
  '/foo/%2e%2e/hello.txt',
  '/foo/%2E%2E/hello.txt',
  '/foo%2f..%2fhello.txt',
  '/%68ello.txt',
  '/hello%2Etxt',
  '/world/../hello.txt',
  '/world%2findex.html',
  '/world%5cindex.html',
  '/world\\index.html',
  '/world//index.html',
  '/foo/../world/'
]) {
  test(`should not serve non-canonical path ${path}`, async (t) => {
    const server = guardedServer();
    const res = await rawGet(server, path);
    t.not(res.status, 200);
    t.false(res.body.includes('world'));
    server.close();
  });
}

test('should serve canonical paths with encoded reserved characters', async (t) => {
  const server = guardedServer();
  const res = await rawGet(server, '/space%20file.txt');
  t.is(res.status, 200);
  t.is(res.body, 'space');
  const index = await rawGet(server, '/index.txt');
  t.is(index.body, 'text index');
  server.close();
});
