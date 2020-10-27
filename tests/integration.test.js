const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.test')
})
const { generateId, getServerlessSdk } = require('./utils')
const execSync = require('child_process').execSync

// set enough timeout for deployment to finish
jest.setTimeout(300000)

const srcPath = path.join(__dirname, '..', 'example/express')

// the yaml file we're testing against
const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  stage: 'dev',
  component: 'framework@dev',
  name: `framework-integration-tests-${generateId()}`,
  inputs: {
    framework: 'express',
    region: 'ap-guangzhou',
    src: {
      src: srcPath
    },
    faas: { runtime: 'Nodejs10.15' },
    apigw: { environment: 'test' }
  }
}

const credentials = {
  tencent: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
  }
}

// get serverless construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

it('should successfully deploy express app', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  execSync('npm install', { cwd: srcPath })

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  expect(instance.outputs.region).toEqual(instanceYaml.inputs.region)
  expect(instance.outputs.apigw).toBeDefined()
  expect(instance.outputs.apigw.environment).toEqual(instanceYaml.inputs.apigw.environment)
  expect(instance.outputs.faas).toBeDefined()
  expect(instance.outputs.faas.runtime).toEqual(instanceYaml.inputs.faas.runtime)
})

it('should successfully remove express app', async () => {
  await sdk.remove(instanceYaml, credentials)
  result = await sdk.getInstance(instanceYaml.org, instanceYaml.stage, instanceYaml.app, instanceYaml.name)

  expect(result.instance.instanceStatus).toEqual('inactive')
})
