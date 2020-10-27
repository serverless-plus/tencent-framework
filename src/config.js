const frameworks = {
  express: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/express-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js'
  },
  koa: {
    injectSlsSdk: true,
    templateUrl: 'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/koa-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js'
  },
  egg: {
    injectSlsSdk: true,
    templateUrl: 'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/egg-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js'
  },
  nest: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/nestjs-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js'
  },
  next: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/nextjs-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js',
    defaultStatics: [
      { src: '.next/static', targetDir: '/_next/static' },
      { src: 'public', targetDir: '/' }
    ],
    defaultCdnConf: {
      autoRefresh: true,
      forceRedirect: {
        switch: 'on',
        redirectType: 'https',
        redirectStatusCode: 301
      },
      https: {
        switch: 'on',
        http2: 'on'
      }
    }
  },
  nuxt: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/nuxtjs-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js',
    defaultStatics: [
      { src: '.nuxt/dist/client', targetDir: '/' },
      { src: 'static', targetDir: '/' }
    ],
    defaultCdnConf: {
      autoRefresh: true,
      forceRedirect: {
        switch: 'on',
        redirectType: 'https',
        redirectStatusCode: 301
      },
      https: {
        switch: 'on',
        http2: 'on'
      }
    }
  },
  laravel: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/laravel-demo.zip',
    runtime: 'Php7'
  },
  thinkphp: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/thinkphp-demo.zip',
    runtime: 'Php7'
  },
  flask: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/flask-demo.zip',
    runtime: 'Python3.6'
  }
}

const CONFIGS = {
  // support metrics frameworks
  supportMetrics: ['express', 'next', 'nuxt'],
  region: 'ap-guangzhou',
  description: 'Created by Serverless Component',
  handler: 'sl_handler.handler',
  timeout: 10,
  memorySize: 128,
  namespace: 'default',
  cos: {
    lifecycle: [
      {
        status: 'Enabled',
        id: 'deleteObject',
        filter: '',
        expiration: { days: '10' },
        abortIncompleteMultipartUpload: { daysAfterInitiation: '10' }
      }
    ]
  }
}

module.exports = (framework) => {
  const frameworkConfigs = frameworks[framework]
  return {
    ...CONFIGS,
    ...frameworkConfigs
  }
}
