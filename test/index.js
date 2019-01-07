const request = require('supertest');
const test = require('ava');
const Koa = require('koa');
const mount = require('koa-mount');
const serve = require('..');

// serve(root)
// when root = "."
test('should serve from cwd', async t => {
  const app = new Koa();
  app.use(serve('.'));
  const res = await request(app.listen()).get('/package.json');
  t.is(res.status, 200);
});

// when path is not a file
test('should 404', async t => {
  const app = new Koa();
  app.use(serve('test/fixtures'));
  const res = await request(app.listen()).get('/something');
  t.is(res.status, 404);
});

// when upstream middleware responds
test('should respond', async t => {
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
test('should serve the file', async t => {
  const app = new Koa();
  app.use(serve('test/fixtures'));
  const res = await request(app.listen()).get('/hello.txt');
  t.is(res.status, 200);
  t.is(res.text, 'world');
});

// .index
// when present
test('should alter the index file supported', async t => {
  const app = new Koa();

  app.use(serve('test/fixtures', { index: 'index.txt' }));

  const res = await request(app.listen()).get('/');
  t.is(res.status, 200);
  t.is(res.headers['content-type'], 'text/plain; charset=utf-8');
  t.is(res.text, 'text index');
});

// when added
test('should use index.html', async t => {
  const app = new Koa();

  app.use(serve('test/fixtures', { index: 'index.html' }));

  const res = await request(app.listen()).get('/world/');
  t.is(res.status, 200);
  t.is(res.headers['content-type'], 'text/html; charset=utf-8');
  t.is(res.text, 'html index');
});

// by default
test('should not use index.html', async t => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen()).get('/world/');
  t.is(res.status, 404);
});

// when method is not `GET` or `HEAD`
test('when method is not GET or HEAD should 404', async t => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen()).post('/hello.txt');
  t.is(res.status, 404);
});

// option - format'
// when format: false'
test('when format false should 404', async t => {
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

test('should 200', async t => {
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
test('when format true should 200', async t => {
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

test('when format true (directory) should 200', async t => {
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
test('should 304', async t => {
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

test('support if-modified-since should 200', async t => {
  const app = new Koa();

  app.use(serve('test/fixtures'));

  const res = await request(app.listen())
    .get('/world/index.html')
    .set('if-modified-since', 'Mon Jan 18 2011 23:04:34 GMT-0600');
  t.is(res.status, 200);
});

// Work with koa-mount
test('should mount fine', async t => {
  const app = new Koa();

  app.use(
    mount('/fixtures', serve(require('path').join(__dirname, '/fixtures')))
  );

  const res = await request(app.listen()).get('/fixtures/hello.txt');
  t.is(res.status, 200);
});

// This is more of a test of js, than of the logic. But something we rely on
// Dates should truncate not, round
test('dates should truncate not round, should mount fine', t => {
  const str = new Date().toUTCString();

  let ms = Date.parse(str);
  ms += 999; // Add 999 ms

  const nd = new Date(ms);
  t.is(nd.toUTCString(), str);
});
