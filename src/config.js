const frameworks = {
  express: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/express-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js',
    defaultStatics: [{ src: 'public', targetDir: '/' }]
  },
  koa: {
    injectSlsSdk: true,
    templateUrl: 'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/koa-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js',
    defaultStatics: [{ src: 'public', targetDir: '/' }]
  },
  egg: {
    injectSlsSdk: true,
    templateUrl: 'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/egg-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js',
    defaultStatics: [{ src: 'public', targetDir: '/' }],
    defaultEnvs: [
      {
        key: 'SERVERLESS',
        value: '1'
      },
      {
        key: 'EGG_APP_CONFIG',
        value: '{"rundir":"/tmp","logger":{"dir":"/tmp"}}'
      }
    ]
  },
  nest: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/nestjs-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js',
    defaultStatics: [{ src: 'public', targetDir: '/' }]
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
    ]
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
    ]
  },
  laravel: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/laravel-demo.zip',
    runtime: 'Php7',
    defaultEnvs: [
      {
        key: 'SERVERLESS',
        value: '1'
      },
      {
        key: 'VIEW_COMPILED_PATH',
        value: '/tmp/storage/framework/views'
      },
      {
        key: 'SESSION_DRIVER',
        value: 'array'
      },
      {
        key: 'LOG_CHANNEL',
        value: 'stderr'
      },
      {
        key: 'APP_STORAGE',
        value: '/tmp'
      }
    ]
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
  },
  django: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/django-demo.zip',
    runtime: 'Python3.6'
  }
}

const CONFIGS = {
  // support metrics frameworks
  pythonFrameworks: ['flask', 'django'],
  supportMetrics: ['express', 'next', 'nuxt'],
  region: 'ap-guangzhou',
  description: 'Created by Serverless Component',
  handler: 'sl_handler.handler',
  timeout: 10,
  memorySize: 128,
  namespace: 'default',
  defaultEnvs: [
    {
      key: 'SERVERLESS',
      value: '1'
    }
  ],
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
  },
  cdn: {
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
}

module.exports = (framework) => {
  const frameworkConfigs = frameworks[framework]
  return {
    ...CONFIGS,
    ...frameworkConfigs
  }
}
