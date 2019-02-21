// const appRoot = require('app-root-path')
// const heapdump = require('heapdump')
// heapdump.writeSnapshot(`${appRoot}logs/${Date.now().heapsnapshot}`)

const Sentry = require('@sentry/node')

Sentry.init({ dsn: 'https://a5e2086b473d477f8af5232b9e2e05e3@sentry.io/1315905' })

require('./apm')
const cors = require('cors')
const express = require('express')
const { ParseServer } = require('parse-server')
const api = require('./api')
const mongo = require('./mongo')
const logger = require('./logger')
const pkg = require('../package.json')
const scheduler = require('./scheduler')
const parseConfig = require('./parse-config')

const parseServer = new ParseServer(parseConfig)

const startup = async () => {
  logger.debug(`${pkg.name} [${pkg.version}] is starting up`)
  const db = await mongo()
  logger.debug(`Created database connection`)
  const app = express()

  app.use(Sentry.Handlers.requestHandler())

  app.use((req, res, next) => {
    req.db = db
    return next()
  })

  app.use(logger.express)
  app.use(cors())

  app.get('/', async (req, res) => res.status(200).send({ result: `kyso-api ${pkg.version}` }))
  app.use(api)
  app.use('/parse', parseServer)

  app.use(async (req, res, next) => { // eslint-disable-line
    res.status(404).send({ error: `404 ${req.url} not found or method not supported for this path` })
  })

  app.use(Sentry.Handlers.errorHandler())
  app.use(async (err, req, res, next) => { // eslint-disable-line
    logger.error(`${err.code || 500}\n${err.message}\n${err.stack || ''}`)
    if (err.code && err.code >= 100 && err.code < 200) {
      err.code = 400
    }
    res.status(err.code || 500).send({ error: err.message })
  })

  app.listen(process.env.PORT || 8000)
  logger.info(`Kyso API listening on port ${process.env.PORT || 8000} in ${app.get('env')} mode at ${process.env.API_URL}`)

  scheduler()
}

const cleanup = async () => {
  await mongo.graceful()
  logger.info('finished cleanup')
  process.exit()
}

process.on('SIGINT', cleanup)

logger.info('start')
startup()
