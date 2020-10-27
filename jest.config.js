const { join } = require('path')
require('dotenv').config({ path: join(__dirname, '.env.test') })

const config = {
  verbose: true,
  silent: true,
  testTimeout: 60000,
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',
  // testRegex: '(/__tests__/ci/ci.ssr\.(test|spec))\\.(js|ts)$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/__tests__/utils/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}

module.exports = config
