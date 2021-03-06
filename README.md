# fengine

> A development tool for f2e
>
> [![NPM Version][npm-image]][npm-url]
> [![Download Status][download-image]][npm-url]
> ![Node Version][node-image]
> [![Dependencies][david-image]][david-url]

## Getting started

### Install

```shell
$ npm install -g fengine
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
hostname: # default: 0.0.0.0 and ::
  127.0.0.1
port: # default: null
  80
base: # default: process.cwd
  /html
layout: # default: null
  /layout/layout.html
data: # default: {server, dirname, filename, extname}
  version:
    0.0.1
watch: # default: ['.htm', '.html'], .htm and .html always be watched
  - .xml
  - .tpl
tags: # default {data: ['{{', '}}'], directive: ['<!--', '-->']}
  data:
    - {{
    - }}
  directive:
    - <!--
    - -->
```

`hostname`: server hostname, don't set if not necessary, see node http module docs. `{String}`

`port`: server port. `{Number}`

`base`: the base dir of where the file transform start. `{String}`

`layout`: default layout file. `{String}`

`data`: the data of template. `{Object}`

`watch`: the extname of file want to be transform. `{Array}`

`tags`: the tags of file template engine. `{Object}`

### Documentation

[fengine wiki](https://github.com/nuintun/fengine/wiki)

## License

[MIT](LICENSE)

[david-image]: http://img.shields.io/david/nuintun/fengine.svg?style=flat-square
[david-url]: https://david-dm.org/nuintun/fengine
[node-image]: http://img.shields.io/node/v/fengine.svg?style=flat-square
[npm-image]: http://img.shields.io/npm/v/fengine.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/fengine
[download-image]: http://img.shields.io/npm/dm/fengine.svg?style=flat-square
