const { Component } = require('@serverless/core')
const { Scf, Apigw, Cns, Cam, Metrics, Cos, Cdn } = require('tencent-component-toolkit')
const { TypeError } = require('tencent-component-toolkit/src/utils/error')
const {
  uploadCodeToCos,
  getDefaultProtocol,
  prepareInputs,
  deepClone,
  prepareStaticCosInputs,
  prepareStaticCdnInputs
} = require('./utils')
const initConfigs = require('./config')

class ServerlessComponent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new TypeError(
        'CREDENTIAL',
        'Cannot get secretId/Key, your account could be sub-account and does not have the access to use SLS_QcsRole, please make sure the role exists first, then visit https://cloud.tencent.com/document/product/1154/43006, follow the instructions to bind the role to your account.'
      )
    }

    return {
      SecretId: tmpSecrets.TmpSecretId,
      SecretKey: tmpSecrets.TmpSecretKey,
      Token: tmpSecrets.Token
    }
  }

  getAppId() {
    return this.credentials.tencent.tmpSecrets.appId
  }

  initialize(framework = 'express') {
    const CONFIGS = initConfigs(framework)
    this.CONFIGS = CONFIGS
    this.framework = framework
    this.__TmpCredentials = this.getCredentials()
  }

  async deployFaas(credentials, inputs) {
    if (!inputs.role) {
      try {
        const cam = new Cam(credentials)
        const roleExist = await cam.CheckSCFExcuteRole()
        if (roleExist) {
          inputs.role = 'QCS_SCFExcuteRole'
        }
      } catch (e) {
        // no op
      }
    }

    const appId = this.getAppId()
    const { region } = inputs
    const { state } = this
    const instance = this
    const funcDeployer = async () => {
      const code = await uploadCodeToCos(instance, appId, credentials, inputs, region)
      const scf = new Scf(credentials, region)
      const tempInputs = {
        ...inputs,
        code
      }
      const scfOutput = await scf.deploy(deepClone(tempInputs))
      const outputs = {
        name: scfOutput.FunctionName,
        runtime: scfOutput.Runtime,
        namespace: scfOutput.Namespace
      }

      // default version is $LATEST
      outputs.lastVersion = scfOutput.LastVersion
        ? scfOutput.LastVersion
        : (state.faas && state.faas.lastVersion) || '$LATEST'

      // default traffic is 1.0, it can also be 0, so we should compare to undefined
      outputs.traffic =
        scfOutput.Traffic !== undefined
          ? scfOutput.Traffic
          : (state.faas && state.faas.traffic) !== undefined
          ? state.faas.traffic
          : 1

      if (outputs.traffic !== 1 && scfOutput.ConfigTrafficVersion) {
        outputs.configTrafficVersion = scfOutput.ConfigTrafficVersion
      }

      return outputs
    }

    const faasOutputs = await funcDeployer(region)

    this.state.faas = faasOutputs
    await this.save()

    return faasOutputs
  }

  // try to add dns record
  async tryToAddDnsRecord(credentials, customDomains) {
    try {
      const cns = new Cns(credentials)
      for (let i = 0; i < customDomains.length; i++) {
        const item = customDomains[i]
        if (item.domainPrefix) {
          await cns.deploy({
            domain: item.subDomain.replace(`${item.domainPrefix}.`, ''),
            records: [
              {
                subDomain: item.domainPrefix,
                recordType: 'CNAME',
                recordLine: '默认',
                value: item.cname,
                ttl: 600,
                mx: 10,
                status: 'enable'
              }
            ]
          })
        }
      }
    } catch (e) {
      console.log('METHOD_tryToAddDnsRecord', e.message)
    }
  }

  async deployApigw(credentials, inputs) {
    if (inputs.isDisabled) {
      return {}
    }

    const { region } = inputs
    const { state } = this

    const apigwDeployer = async () => {
      const apigw = new Apigw(credentials, region)

      const oldState = state.apigw || {}
      const apigwInputs = {
        ...inputs,
        oldState: {
          apis: oldState.apis || [],
          customDomains: oldState.customDomains || []
        }
      }
      // different region deployment has different service id
      apigwInputs.serviceId = inputs.id || (state.apigw && state.apigw.id)
      const apigwOutput = await apigw.deploy(deepClone(apigwInputs))
      const outputs = {
        url: `${getDefaultProtocol(apigwInputs.protocols)}://${apigwOutput.subDomain}/${
          apigwOutput.environment
        }${apigwInputs.endpoints[0].path}`,
        id: apigwOutput.serviceId,
        domain: apigwOutput.subDomain,
        environment: apigwOutput.environment,
        apis: apigwOutput.apiList
      }

      if (apigwOutput.customDomains) {
        // TODO: need confirm add cns authentication
        if (inputs.autoAddDnsRecord === true) {
          // await this.tryToAddDnsRecord(credentials, apigwOutput.customDomains)
        }
        outputs.customDomains = apigwOutput.customDomains
      }
      return outputs
    }

    const apigwOutputs = await apigwDeployer()

    this.state.apigw = apigwOutputs
    await this.save()

    return apigwOutputs
  }

  // deploy static to cos, and setup cdn
  async deployStatic(credentials, inputs, region) {
    const { state, framework } = this
    const { zipPath } = state
    const appId = this.getAppId()
    const deployStaticOutpus = {}

    if (zipPath) {
      console.log(`Deploy static for ${framework} application`)
      // 1. deploy to cos
      const { staticCosInputs, bucket } = await prepareStaticCosInputs(this, inputs, appId, zipPath)

      const cos = new Cos(credentials, region)
      const cosOutput = {
        region
      }
      // flush bucket
      if (inputs.cos.replace) {
        await cos.flushBucketFiles(bucket)
      }
      for (let i = 0; i < staticCosInputs.length; i++) {
        const curInputs = staticCosInputs[i]
        console.log(`Starting deploy directory ${curInputs.src} to cos bucket ${curInputs.bucket}`)
        const deployRes = await cos.deploy(curInputs)
        cosOutput.origin = `${curInputs.bucket}.cos.${region}.myqcloud.com`
        cosOutput.bucket = deployRes.bucket
        cosOutput.url = `https://${curInputs.bucket}.cos.${region}.myqcloud.com`
        console.log(`Deploy directory ${curInputs.src} to cos bucket ${curInputs.bucket} success`)
      }
      deployStaticOutpus.cos = cosOutput

      // 2. deploy cdn
      if (inputs.cdn) {
        const cdn = new Cdn(credentials)
        const cdnInputs = await prepareStaticCdnInputs(this, inputs, cosOutput.cosOrigin)
        console.log(`Starting deploy cdn ${cdnInputs.domain}`)
        const cdnDeployRes = await cdn.deploy(cdnInputs)
        const protocol = cdnInputs.https ? 'https' : 'http'
        const cdnOutput = {
          domain: cdnDeployRes.domain,
          url: `${protocol}://${cdnDeployRes.domain}`,
          cname: cdnDeployRes.cname
        }
        deployStaticOutpus.cdn = cdnOutput

        console.log(`Deploy cdn ${cdnInputs.domain} success`)
      }

      console.log(`Deployed static for ${framework} application successfully`)

      return deployStaticOutpus
    }

    return null
  }

  async deploy(inputs) {
    this.initialize(inputs.framework)
    const { __TmpCredentials, CONFIGS } = this

    console.log(`Deploying ${this.framework} Application`)

    const { region, faasConfig, apigwConfig } = await prepareInputs(this, inputs)

    const outputs = {
      region
    }
    if (!faasConfig.code.src) {
      outputs.templateUrl = CONFIGS.templateUrl
    }

    const deployTasks = [this.deployFaas(__TmpCredentials, faasConfig)]
    // support apigw.isDisabled
    if (apigwConfig.isDisabled !== true) {
      deployTasks.push(this.deployApigw(__TmpCredentials, apigwConfig))
    } else {
      this.state.apigw.isDisabled = true
    }
    const [faasOutputs, apigwOutputs = {}] = await Promise.all(deployTasks)

    outputs['faas'] = faasOutputs
    outputs['apigw'] = apigwOutputs

    // start deploy static cdn
    if (inputs.static) {
      outputs.static = await this.deployStatic(__TmpCredentials, inputs.static, region)
    }

    // this config for online debug
    this.state.region = region
    this.state.namespace = faasConfig.namespace
    this.state.lambdaArn = faasConfig.name

    return outputs
  }

  async removeStatic(credentials) {
    // remove static
    const { region, static: staticState } = this.state
    if (staticState) {
      console.log(`Removing static config`)
      // 1. remove cos
      if (staticState.cos) {
        const cos = new Cos(credentials, region)
        await cos.remove(staticState.cos)
      }
      // 2. remove cdn
      if (staticState.cdn) {
        const cdn = new Cdn(credentials)
        try {
          await cdn.remove(staticState.cdn)
        } catch (e) {
          // no op
        }
      }
      console.log(`Remove static config success`)
    }
  }

  async remove(inputs) {
    this.initialize(inputs.framework)
    const { __TmpCredentials, framework } = this

    console.log(`Removing ${framework} App`)

    const { state } = this
    const { region } = state

    const { faas: faasState, apigw: apigwState } = state
    const scf = new Scf(__TmpCredentials, region)
    const apigw = new Apigw(__TmpCredentials, region)
    await scf.remove({
      functionName: faasState.name,
      namespace: faasState.namespace
    })
    // if disable apigw, no need to remove
    if (apigwState.isDisabled !== true) {
      await apigw.remove({
        created: true,
        serviceId: apigwState.id,
        environment: apigwState.environment,
        apiList: apigwState.apis,
        customDomains: apigwState.customDomains
      })
    }

    // remove static
    await this.removeStatic(__TmpCredentials)

    this.state = {}

    return {}
  }

  async metrics(inputs = {}) {
    this.initialize(inputs.framework)
    const { __TmpCredentials, framework } = this

    console.log(`Get ${framework} Metrics Datas...`)
    if (!inputs.rangeStart || !inputs.rangeEnd) {
      throw new TypeError(
        `PARAMETER_${framework.toUpperCase()}_METRICS`,
        'rangeStart and rangeEnd are require inputs'
      )
    }
    const { region } = this.state
    if (!region) {
      throw new TypeError(
        `PARAMETER_${framework.toUpperCase()}_METRICS`,
        'No region property in state'
      )
    }
    const { name, namespace, latestVersion } = this.state.faas || {}
    if (name) {
      const options = {
        funcName: name,
        namespace: namespace,
        version: latestVersion,
        region,
        timezone: inputs.tz
      }

      const { apigw } = this.state
      if (apigw.id) {
        options.apigwServiceId = apigw.id
        options.apigwEnvironment = apigw.environment || 'release'
      }
      const mertics = new Metrics(__TmpCredentials, options)
      const metricResults = await mertics.getDatas(
        inputs.rangeStart,
        inputs.rangeEnd,
        Metrics.Type.All
      )
      return metricResults
    }
    throw new TypeError(`PARAMETER_${framework.toUpperCase()}_METRICS`, 'Function name not define')
  }
}

module.exports = ServerlessComponent
