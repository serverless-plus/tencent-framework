# Serverless Framework Component

Serverless Web 框架组件，可以方便将传统 Web 框架部署到腾讯云 Serverless 架构上。

目前支持框架：

- [x] Express
- [ ] Koa
- [ ] Egg.js
- [ ] Next.js
- [ ] Nuxt.js
- [x] Flask
- [ ] Django
- [x] Laravel
- [ ] ThinkPHP

### 安装

通过 npm 安装最新版本的 Serverless Framework

```bash
$ npm install -g serverless
```

### 初始化项目

通过如下命令和模板链接，快速创建一个 Express 应用：

```bash
$ serverless init express-starter --name example
$ cd example
```

### 配置

以下是 Express 框架的 `serverless.yml`配置示例：

```yml
app: serverless
stage: dev
component: framework
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

> 注意：`inputs` 中 `framework` 参数是必须的，组件将根据该参数来对 Web 框架项目进行自动化部署。

### 5. 开发调试

部署了 Express.js 应用后，可以通过开发调试能力对该项目进行二次开发，从而开发一个生产应用。在本地修改和更新代码后，不需要每次都运行 `serverless deploy` 命令来反复部署。你可以直接通过 `serverless dev` 命令对本地代码的改动进行检测和自动上传。

可以通过在 `serverless.yml`文件所在的目录下运行 `serverless dev` 命令开启开发调试能力。

`serverless dev` 同时支持实时输出云端日志，每次部署完毕后，对项目进行访问，即可在命令行中实时输出调用日志，便于查看业务情况和排障。

除了实时日志输出之外，针对 Node.js 应用，当前也支持云端调试能力。在开启 `serverless dev` 命令之后，将会自动监听远端端口，并将函数的超时时间临时配置为 900s。此时你可以通过访问 chrome://inspect/#devices 查找远端的调试路径，并直接对云端代码进行断点等调试。在调试模式结束后，需要再次部署从而将代码更新并将超时时间设置为原来的值。详情参考[开发模式和云端调试](https://cloud.tencent.com/document/product/1154/43220)。

### 6. 查看状态

在`serverless.yml`文件所在的目录下，通过如下命令查看部署状态：

```
$ serverless info
```

### 7. 移除

在`serverless.yml`文件所在的目录下，通过以下命令移除部署的 Express 服务。移除后该组件会对应删除云上部署时所创建的所有相关资源。

```
$ serverless remove
```

和部署类似，支持通过 `serverless remove --debug` 命令查看移除过程中的实时日志信息。

## 账号配置

当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件

```console
$ touch .env # 腾讯云的配置信息
```

在 `.env` 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存

如果没有腾讯云账号，可以在此[注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在[API 密钥管理](https://console.cloud.tencent.com/cam/capi)中获取 `SecretId` 和`SecretKey`.

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

## License

MIT License

Copyright (c) 2020 Serverless Plus
