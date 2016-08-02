fengine
==========

>A development tool for f2e

>[![NPM Version][npm-image]][npm-url]
>[![Download Status][download-image]][npm-url]
>![Node Version][node-image]
>[![Dependencies][david-image]][david-url]

Getting started
==========

### Install

```shell
$ npm install fengine
```

### Introduction

if you have installed `fengine`, you can run fengine by command:

```shell
$ fengine
```

and use:

```shell
$ fengine -h
```

for help.

you can config server by `fengine.yml` under server root:
```yml
port: # default: 80
  80
base: # default: process.cwd
  /html
layout: # default: null
  /layout/layout.html
```

`port`: server port. `{Number}`

`base`: transform file base dir. `{String}`

`layout`: default layout file. `{String}`

## License

[MIT](LICENSE)

[david-image]: http://img.shields.io/david/nuintun/fengine.svg?style=flat-square
[david-url]: https://david-dm.org/nuintun/fengine
[node-image]: http://img.shields.io/node/v/fengine.svg?style=flat-square
[npm-image]: http://img.shields.io/npm/v/fengine.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/fengine
[download-image]: http://img.shields.io/npm/dm/fengine.svg?style=flat-square
