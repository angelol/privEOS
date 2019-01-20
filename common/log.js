const log = require('loglevel')

let config

try {
	config = require('../common/config')
	log.setDefaultLevel(config.logLevel)
} catch(e) {
	log.error("../common/config.js not found. Please copy ../common/config.js-example to ../common/config.js and modify to your needs.")
	process.exit(1)
}


const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    return function() {
      let messages = [`${String(new Date())}:`]
      for (const argument of arguments) {
        messages.push(argument)
      }
      rawMethod.apply(undefined, messages)
    }
}
log.setLevel(log.getLevel())

module.exports = log
