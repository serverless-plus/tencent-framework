const frameworks = {
  express: {
    injectSlsSdk: true,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/express-demo.zip',
    runtime: 'Nodejs10.15',
    defaultEntryFile: 'sls.js'
  },
  laravel: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/laravel-demo.zip',
    runtime: 'Php7'
  },
  flask: {
    injectSlsSdk: false,
    templateUrl:
      'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/laravel-demo.zip',
    runtime: 'Python3.6'
  }
}

const CONFIGS = {
  region: 'ap-guangzhou',
  description: 'Created by Serverless Component',
  handler: 'sl_handler.handler',
  timeout: 3,
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
