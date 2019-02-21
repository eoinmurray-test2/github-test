const expressWinston = require('express-winston')
const winston = require('winston')
const jsome = require('jsome')
const chalk = require('chalk')

const { splat, combine, timestamp, printf } = winston.format

function isObject(val) {
  if (val === null) { return false }
  return ((typeof val === 'function') || (typeof val === 'object'))
}

const options = {
  console: {
    level: process.env.LOG_LEVEL || 'info',
    handleExceptions: true,
    format: combine(
      timestamp(),
      splat(),
      printf(({ timestamp, level, message, meta }) => {
        let msg = `[${level}] > ${message}`
        try {
          if (isObject(message)) {
            msg = `[${level}] > ${jsome.getColoredString(message)}`
          } else {
            msg = `[${level}] > ${chalk.blue(message)}`
          }
        } catch (err) { /* pass */ }

        if (process.env.NODE_ENV === 'production') {
          return JSON.stringify({ message: msg })
        }
        return msg
      })
    ),
    colorize: true,
  },
}

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(options.console)
  ],
  exitOnError: false
})

logger.error = err => {
  if (err instanceof Error) {
    logger.log({ level: 'error', message: `${err.stack || err}` })
  } else {
    logger.log({ level: 'error', message: err })
  }
}

logger.express = expressWinston.logger({
  winstonInstance: logger,
  meta: false,
  level: 'info',
  msg: "HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}",
  colorize: true,
  ignoreRoute: (req) => (req.url === '/parse/classes/Container' || req.url === '/parse/classes/Instance')
})

module.exports = logger
