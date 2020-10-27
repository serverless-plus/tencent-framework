const path = require('path')
const fs = require('fs')
const { Cos } = require('tencent-component-toolkit')
const download = require('download')
const { TypeError } = require('tencent-component-toolkit/src/utils/error')
const AdmZip = require('adm-zip')

/*
 * Generates a random id
 */
const generateId = () =>
  Math.random()
    .toString(36)
    .substring(6)

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

const getType = (obj) => {
  return Object.prototype.toString.call(obj).slice(8, -1)
}

const capitalString = (str) => {
  if (str.length < 2) {
    return str.toUpperCase()
  }

  return `${str[0].toUpperCase()}${str.slice(1)}`
}

const getTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

const getDefaultProtocol = (protocols) => {
  return String(protocols).includes('https') ? 'https' : 'http'
}

const getDefaultFunctionName = (framework) => {
  return `${framework}-${generateId()}`
}

const getDefaultServiceName = () => {
  return 'serverless'
}

const getDefaultServiceDescription = () => {
  return 'Created by Serverless Component'
}

const getDefaultBucketName = (region) => {
  return `serverless-${region}-code`
}

const getDefaultObjectName = (inputs) => {
  return `${inputs.name}-${getTimestamp()}.zip`
}

const getDirFiles = (dirPath) => {
  const targetPath = path.resolve(dirPath)
  const files = fs.readdirSync(targetPath)
  const temp = {}
  files.forEach((file) => {
    temp[file] = path.join(targetPath, file)
  })
  return temp
}

const removeAppid = (str, appid) => {
  const suffix = `-${appid}`
  if (!str || str.indexOf(suffix) === -1) {
    return str
  }
  return str.slice(0, -suffix.length)
}

const validateTraffic = (framework, num) => {
  if (getType(num) !== 'Number') {
    throw new TypeError(`PARAMETER_${framework.toUpperCase()}_TRAFFIC`, 'traffic must be a number')
  }
  if (num < 0 || num > 1) {
    throw new TypeError(
      `PARAMETER_${framework.toUpperCase()}_TRAFFIC`,
      'traffic must be a number between 0 and 1'
    )
  }
  return true
}

const getCodeZipPath = async (instance, inputs) => {
  const { CONFIGS, framework } = instance
  console.log(`Packaging ${framework} application`)

  // unzip source zip file
  let zipPath
  if (!inputs.code.src) {
    // add default template
    const downloadPath = `/tmp/${generateId()}`
    const filename = 'template'

    console.log(`Downloading default ${framework} application`)
    try {
      await download(CONFIGS.templateUrl, downloadPath, {
        filename: `${filename}.zip`
      })
    } catch (e) {
      throw new TypeError(`DOWNLOAD_TEMPLATE`, 'Download default template failed.')
    }
    zipPath = `${downloadPath}/${filename}.zip`
  } else {
    zipPath = inputs.code.src
  }

  return zipPath
}

// get files/dirs need to inject to project code
const getInjection = (instance, framework) => {
  const { CONFIGS } = instance
  let injectFiles = {}
  let injectDirs = {}
  const shimPath = path.join(__dirname, '_shims', framework)
  if (CONFIGS.injectSlsSdk) {
    injectFiles = instance.getSDKEntries(`_shims/handler.handler`)
    injectDirs = {
      _shims: shimPath
    }
  } else {
    injectFiles = getDirFiles(shimPath)
  }

  return { injectFiles, injectDirs }
}

/**
 * Upload code to COS
 * @param {Component} instance serverless component instance
 * @param {string} appId app id
 * @param {object} credentials credentials
 * @param {object} inputs component inputs parameters
 * @param {string} region region
 */
const uploadCodeToCos = async (instance, appId, credentials, inputs, region) => {
  const { CONFIGS, framework } = instance
  const bucketName = inputs.code.bucket || getDefaultBucketName(region)
  const objectName = inputs.code.object || getDefaultObjectName(inputs)
  const bucket = `${bucketName}-${appId}`

  const zipPath = await getCodeZipPath(instance, inputs)
  console.log(`Code zip path ${zipPath}`)

  // save the zip path to state for lambda to use it
  instance.state.zipPath = zipPath

  const cos = new Cos(credentials, region)

  if (!inputs.code.bucket) {
    // create default bucket
    await cos.deploy({
      force: true,
      bucket: bucketName + '-' + appId,
      lifecycle: CONFIGS.cos.lifecycle
    })
  }
  if (!inputs.code.object) {
    console.log(`Getting cos upload url for bucket ${bucketName}`)
    const uploadUrl = await cos.getObjectUrl({
      bucket: bucket,
      object: objectName,
      method: 'PUT'
    })

    // if shims and sls sdk entries had been injected to zipPath, no need to injected again
    console.log(`Uploading code to bucket ${bucketName}`)

    const { injectFiles, injectDirs } = getInjection(instance, framework)

    await instance.uploadSourceZipToCOS(zipPath, uploadUrl, injectFiles, injectDirs)
    console.log(`Upload ${objectName} to bucket ${bucketName} success`)
  }

  // save bucket state
  instance.state.bucket = bucketName
  instance.state.object = objectName

  return {
    bucket: bucketName,
    object: objectName
  }
}

const prepareStaticCosInputs = async (instance, inputs, appId, codeZipPath) => {
  const { CONFIGS, framework } = instance
  try {
    const staticCosInputs = []
    const { cos: cosConfig } = inputs
    const sources = cosConfig.sources || CONFIGS.defaultStatics
    const { bucket } = cosConfig
    // remove user append appid
    const bucketName = removeAppid(bucket, appId)
    const staticPath = `/tmp/${generateId()}`
    const codeZip = new AdmZip(codeZipPath)
    const entries = codeZip.getEntries()

    // traverse sources, generate static directory and deploy to cos
    for (let i = 0; i < sources.length; i++) {
      const curSource = sources[i]
      const entryName = `${curSource.src}`
      let exist = false
      entries.forEach((et) => {
        if (et.entryName.indexOf(entryName) === 0) {
          codeZip.extractEntryTo(et, staticPath, true, true)
          exist = true
        }
      })
      if (exist) {
        const cosInputs = {
          force: true,
          protocol: cosConfig.protocol,
          bucket: `${bucketName}-${appId}`,
          src: `${staticPath}/${entryName}`,
          keyPrefix: curSource.targetDir || '/',
          acl: {
            permissions: 'public-read',
            grantRead: '',
            grantWrite: '',
            grantFullControl: ''
          }
        }

        if (cosConfig.acl) {
          cosInputs.acl = {
            permissions: cosConfig.acl.permissions || 'public-read',
            grantRead: cosConfig.acl.grantRead || '',
            grantWrite: cosConfig.acl.grantWrite || '',
            grantFullControl: cosConfig.acl.grantFullControl || ''
          }
        }

        staticCosInputs.push(cosInputs)
      }
    }
    return {
      bucket: `${bucketName}-${appId}`,
      staticCosInputs
    }
  } catch (e) {
    throw new TypeError(`UTILS_${framework}_prepareStaticCosInputs`, e.message, e.stack)
  }
}

const prepareStaticCdnInputs = async (instance, inputs, origin) => {
  const { CONFIGS, framework } = instance
  try {
    const { cdn: cdnConfig } = inputs
    const cdnInputs = {
      async: true,
      area: cdnConfig.area || 'mainland',
      domain: cdnConfig.domain,
      serviceType: 'web',
      origin: {
        origins: [origin],
        originType: 'cos',
        originPullProtocol: 'https'
      },
      autoRefresh: true,
      ...cdnConfig
    }
    if (cdnConfig.https) {
      // using these default configs, for making user's config more simple
      cdnInputs.forceRedirect =
        cdnConfig.https.forceRedirect || CONFIGS.defaultcdnConfig.forceRedirect
      if (!cdnConfig.https.certId) {
        throw new TypeError(`PARAMETER_${framework}_HTTPS`, 'https.certId is required')
      }
      cdnInputs.https = {
        ...CONFIGS.defaultcdnConfig.https,
        ...{
          http2: cdnConfig.https.http2 || 'on',
          certInfo: {
            certId: cdnConfig.https.certId
          }
        }
      }
    }
    if (cdnInputs.autoRefresh) {
      cdnInputs.refreshCdn = {
        flushType: cdnConfig.refreshType || 'delete',
        urls: [`http://${cdnInputs.domain}`, `https://${cdnInputs.domain}`]
      }
    }

    return cdnInputs
  } catch (e) {
    throw new TypeError(`UTILS_${framework}_prepareStaticCdnInputs`, e.message, e.stack)
  }
}

const prepareInputs = async (instance, inputs = {}) => {
  const { CONFIGS, framework, state } = instance
  const fromClientRemark = `tencent-${framework}`
  const region = inputs.region || CONFIGS.region

  // chenck state function name
  const stateFaasName = state.faas && state.faas.name

  const tempFaasConfig = inputs.faas || {}
  const faasConfig = Object.assign(tempFaasConfig, {
    fromClientRemark,
    publish: inputs.publish, // get from command
    traffic: inputs.traffic, // get from command
    region: region,
    code: {
      src: inputs.src,
      bucket: inputs.srcOriginal && inputs.srcOriginal.bucket,
      object: inputs.srcOriginal && inputs.srcOriginal.object
    },
    name: tempFaasConfig.name || stateFaasName || getDefaultFunctionName(),
    role: tempFaasConfig.role || '',
    handler: tempFaasConfig.handler || CONFIGS.handler,
    runtime: tempFaasConfig.runtime || CONFIGS.runtime,
    namespace: tempFaasConfig.namespace || CONFIGS.namespace,
    description: tempFaasConfig.description || CONFIGS.description,
    layers: tempFaasConfig.layers || [],
    cfs: tempFaasConfig.cfs || [],
    lastVersion: state.lastVersion,
    timeout: tempFaasConfig.timeout || CONFIGS.timeout,
    memorySize: tempFaasConfig.memorySize || CONFIGS.memorySize,
    tags: tempFaasConfig.tags
  })

  // validate traffic
  if (inputs.traffic !== undefined) {
    validateTraffic(framework, inputs.traffic)
  }
  faasConfig.needSetTraffic = inputs.traffic !== undefined && faasConfig.lastVersion

  const slsEntryFile = inputs.entryFile || CONFIGS.defaultEntryFile
  instance.slsEntryFile = slsEntryFile
  if (tempFaasConfig.environment) {
    faasConfig.environment = tempFaasConfig.environment
    faasConfig.environment.variables = faasConfig.environment.variables || {}
    faasConfig.environment.variables.SERVERLESS = '1'
    faasConfig.environment.variables.SLS_ENTRY_FILE = slsEntryFile
  } else {
    faasConfig.environment = {
      variables: {
        SERVERLESS: '1',
        SLS_ENTRY_FILE: inputs.entryFile || CONFIGS.defaultEntryFile
      }
    }
  }

  if (tempFaasConfig.vpc) {
    faasConfig.vpcConfig = tempFaasConfig.vpc
  }

  const tempApigwConfig = inputs.apigw ? inputs.apigw : {}
  const apigwConfig = Object.assign(tempApigwConfig, {
    serviceId: tempApigwConfig.id,
    region: region,
    isDisabled: tempApigwConfig.isDisabled === true,
    fromClientRemark: fromClientRemark,
    serviceName: tempApigwConfig.name || getDefaultServiceName(instance),
    serviceDesc: tempApigwConfig.description || getDefaultServiceDescription(instance),
    protocols: tempApigwConfig.protocols || ['http'],
    environment: tempApigwConfig.environment || 'release',
    api: tempApigwConfig.api || {
      path: '/',
      method: 'ANY',
      name: 'index'
    },
    function: tempApigwConfig.function || {}
  })
  if (!apigwConfig.endpoints) {
    apigwConfig.endpoints = [
      {
        path: tempApigwConfig.api.path || '/',
        apiName: tempApigwConfig.api.name || 'index',
        method: tempApigwConfig.api.method || 'ANY',
        enableCORS: tempApigwConfig.cors,
        serviceTimeout: tempApigwConfig.timeout,
        function: {
          isIntegratedResponse: true,
          functionName: faasConfig.name,
          functionNamespace: faasConfig.namespace,
          functionQualifier: tempApigwConfig.function.qualifier || '$DEFAULT'
        }
      }
    ]
  }

  // using this transformation to simplize yaml config
  if (tempApigwConfig.customDomains && tempApigwConfig.customDomains.length > 0) {
    apigwConfig.customDomains = tempApigwConfig.customDomains.map((item) => {
      return {
        domain: item.domain,
        certificateId: item.certId,
        isDefaultMapping: !item.customMap,
        pathMappingSet: item.pathMap,
        protocols: item.protocols
      }
    })
  }

  return {
    region,
    faasConfig,
    apigwConfig
  }
}

module.exports = {
  deepClone,
  generateId,
  uploadCodeToCos,
  capitalString,
  getDefaultProtocol,
  prepareInputs,
  prepareStaticCosInputs,
  prepareStaticCdnInputs
}