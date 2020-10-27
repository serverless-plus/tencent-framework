# Serverless Framework Component

<!-- [![Build Status](https://github.com/serverless-plus/tencent-framework/workflows/Test/badge.svg?branch=master)](https://github.com/serverless-plus/tencent-framework/actions?query=workflow:Test+branch:master) -->

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

> 此组件非腾讯云官方组件，很多特性是实验性的。如果有相关疑问，请提交 issue 或者 pr。

Serverless Web 框架组件，可以方便将传统 Web 框架部署到腾讯云 Serverless 架构上，支持目前流行的所有 Web 框架。

目前支持框架：

- [x] Express.js
- [x] Koa.js
- [x] Egg.js
- [x] Next.js
- [x] Nuxt.js
- [x] Nest.js
- [x] Laravel
- [x] ThinkPHP
- [x] Flask
- [ ] Django

## 愿景 🚀🚀🚀

由于现存 Web 框架组件太多了，配置文档比较零散，维护起来比较困难，但是 Web 框架组件的核心逻辑基本一致，为此作为`第三方开发者`开发了本适配所有 Web 框架的组件。而且 yaml `配置`也进行了`重新设计`，`不兼容其他独立的框架组件配置`。

希望因此能够帮助到广大爱好 Serverless Components 的开发者。

## 示例项目

[Examples](./examples)

## 安装

通过 npm 安装最新版本的 Serverless Framework

```bash
$ npm install -g serverless
```

## 初始化项目

通过如下命令和模板链接，快速创建一个 Express 应用：

```bash
$ serverless init express-starter --name example
$ cd example
```

## 配置

**现在还是开发阶段，版本为 `framework@dev`**。

以下是 Express 框架的 `serverless.yml`配置示例：

```yml
app: serverless
stage: dev
component: framework@dev
name: express-demo

inputs:
  framework: express
  src:
    src: ./
    exclude:
      - .env
  region: ap-guangzhou
  faas:
    name: express-demo
  apigw:
    protocols:
      - http
      - https
    environment: release
```

[全量配置](./docs/configure.md)

> 注意：`inputs` 中 `framework` 参数是必须的，组件将根据该参数来对 Web 框架项目进行自动化部署，目前 `framework` 支持 Web 框架有 `express`、`koa`、`egg`、`next`、`nuxt`、`nest`、`laravel`、`thinkphp`、`flask`。

## 部署

```bash
$ sls deploy
```

## License

MIT License

Copyright (c) 2020 Serverless Plus
