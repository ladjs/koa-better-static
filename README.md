# [**@ladjs/koa-better-static**](https://github.com/ladjs/koa-better-static)

[![build status](https://img.shields.io/travis/ladjs/koa-better-static.svg)](https://travis-ci.com/ladjs/koa-better-static)
[![code coverage](https://img.shields.io/codecov/c/github/ladjs/koa-better-static.svg)](https://codecov.io/gh/ladjs/koa-better-static)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/ladjs/koa-better-static.svg)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/@ladjs/koa-better-static.svg)](https://npm.im/@ladjs/koa-better-static)

> Static file serving middleware for Koa.  Forked from an inactive project and maintained for Lad.


## Table of Contents

* [Features](#features)
* [Install](#install)
* [Usage](#usage)
* [Options](#options)
* [Contributors](#contributors)
* [License](#license)


## Features

Our package `@ladjs/koa-better-static` is a high-performance, drop-in replacement for `koa-static` and is a modernized, Koa 2.x+ fork of `koa-better-static` (which is unmaintained and inactive).

* Uses a more optimal version of `koa-send`
* Supports `If-Modified-Since` header for cache/performance
* Removal of `gzip` option (which checks for .gz files)
* Removal of `defer` (if you want this behavior, put the middleware at the end)
* No default `index` file


## Install

[npm][]:

```sh
npm install @ladjs/koa-better-static
```

[yarn][]:

```sh
yarn add @ladjs/koa-better-static
```


## Usage

This package exposes a function which accepts two arguments `root` (String - the path to serve assets from) and `opts` (an Object of options, see [Options](#options) below).

```js
const serve = require('@ladjs/koa-better-static');
const koa = require('koa');
const app = koa();

// GET /package.json
app.use(serve('.'));

// GET /hello.txt
app.use(serve('test/fixtures'));

// or use absolute paths
app.use(serve(__dirname + '/test/fixtures'));

app.listen(3000, () => {
  console.log('listening on port 3000');
});
```


## Options

* `maxage` Browser cache max-age in milliseconds. defaults to `0` (`maxAge` camelCase also works as a valid option alternative)
* `hidden` Allow transfer of hidden files. defaults to false
* `index` Default file name, defaults to none
* `ifModifiedSinceSupport`  by sending a 304 (not modified) response. Defaults to true
* `format`  Allow trailing slashes for directories (e.g.  /directory and /directory. Defaults to true


## Contributors

| Name           | Website                    |
| -------------- | -------------------------- |
| **Nick Baugh** | <http://niftylettuce.com/> |


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com/)


## 

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/
