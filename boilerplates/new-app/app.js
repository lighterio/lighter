var lighter = require('lighter')

var app = module.exports = lighter({

  configPath: 'config/${ENV}.json',

  port: 8888,

  processCount: 1,

  logger: [
    {transport: 'console', level: 'trace'},
    {transport: 'file', level: 'info', path: 'log/${YYYY}/${MM}/${DD}/info-${HH}:${NN}-${HOST}.log'}
  ],

  dbs: {

  }

})
