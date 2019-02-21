const Agenda = require('agenda')
const mongo = require('./mongo')
const stopInactiveContainers = require('./containers/stop-inactive-containers')
const stopDanglingContainers = require('./containers/stop-dangling-containers')
const calculateWeeklyStudyAnalytics = require('./studies/calculate-weekly-study-analytics')
const uploadWeeklyStudyAnalyticsToMixpanel = require('./studies/upload-weekly-study-analytics-to-mixpanel')
const logger = require('./logger')

let agenda

const scheduler = async () => {
  agenda = new Agenda({ mongo: mongo.getClient() })

  agenda.define('stop-inactive-containers', { lockLifetime: 120000 }, async (job, done) => {
    await stopInactiveContainers({ staleTime: 5 /* minutes */ })
    await stopDanglingContainers()
    done()
  })

  agenda.define('calculate-weekly-study-analytics', { lockLifetime: 120000 }, async (job, done) => {
    await calculateWeeklyStudyAnalytics()
    await uploadWeeklyStudyAnalyticsToMixpanel()
    done()
  })

  await agenda.start()

  await agenda.every('1 minute', 'stop-inactive-containers')

  await agenda.every('1 day', 'calculate-weekly-study-analytics')
}

scheduler.graceful = () => new Promise(resolve => {
  logger.debug(`Gracefully closing scheduler`)
  if (agenda) {
    agenda.stop(() => {
      logger.debug('stopped scheduler')
      resolve()
    })
  } else {
    resolve()
  }
})

module.exports = scheduler
