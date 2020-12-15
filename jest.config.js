const { join } = require('path')
require('dotenv').config({ path: join(__dirname, '.env.test') })

const config = {
  verbose: true,
  silent: true,
  testTimeout: 600000,
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/__tests__/utils/', '/examples/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}

module.exports = config
