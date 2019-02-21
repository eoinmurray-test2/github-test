const ms = require('ms')
const moment = require('moment')
const getRecentStudies = require('./get-recent-studies')
const getRobotUser = require('../auth/get-robot-user')
const { Parse, Study } = require('../parse-rest')

const omit = (object, key) => {
  const { [key]: deletedKey, ...otherKeys } = object
  return otherKeys
}

module.exports = async () => {
  try {
    const start = new Date()
    const now = moment()
    const dateBucket = `${now.year()}-${now.isoWeeks()}`

    const robotUser = await getRobotUser()
    const studies = await getRecentStudies({ limit: 1000000, sessionToken: robotUser.sessionToken })

    for (const study of studies) {
      // console.log(`\n\n[${study.user ? study.user.nickname : ''}/${study.name}]`)
      const analytics = study.analytics || { views: {}, stars: {}, lastUpdate: null }
      const totalViews = study.views || 0
      const totalStars = study.stars || 0

      const pastViews = Object
        .values(omit(analytics.views, dateBucket))
        .reduce((a, b) => a + b, 0)

      const pastStars = Object
        .values(omit(analytics.stars, dateBucket))
        .reduce((a, b) => a + b, 0)

      const viewsThisWeek = totalViews - pastViews
      const starsThisWeek = totalStars - pastStars

      analytics.views[dateBucket] = viewsThisWeek
      analytics.stars[dateBucket] = starsThisWeek
      // console.log(`\t- ${viewsThisWeek} views this week, ${totalViews} so far`)
      // console.log(`\t- ${starsThisWeek} stars this week, ${totalStars} so far`)
      analytics.lastUpdate = moment().toISOString()
      const query = new Parse.Query(Study)
      const parseStudy = await query.get(study.objectId, { useMasterKey: true })
      parseStudy.set('views', totalViews)
      parseStudy.set('stars', totalStars)
      parseStudy.set('analytics', analytics)
      await parseStudy.save(null, { useMasterKey: true })
      // console.log(`\t- finished [${ms(new Date() - start)}]`)
    }
  } catch (err) {
    console.error(err)
  }
}
