const moment = require('moment')
const getRobotUser = require('../auth/get-robot-user')
const { Parse, Study } = require('../parse-rest')
const { mixpanel } = require('../analytics')

const compareViewsAllTime = (a, b) => {
  if (a.views > b.views) {
    return -1
  }
  return 1
}

const compareViewsThisWeek = (a, b) => {
  const now = moment()
  const dateBucket = `${now.year()}-${now.isoWeeks()}`
  if (a.analytics && b.analytics) {
    if ((dateBucket in a.analytics.views) && (dateBucket in b.analytics.views)) {
      if (a.analytics.views[dateBucket] > b.analytics.views[dateBucket]) {
        return -1
      }
      return 1
    }
  }
  return 1
}


module.exports = async () => {
  try {
    const now = moment()
    const dateBucket = `${now.year()}-${now.isoWeeks()}`
    const robotUser = await getRobotUser()

    const userQuery = new Parse.Query(Parse.User)
    userQuery.limit(10000000)
    const parseUsers = await userQuery.find({ sessionToken: robotUser.sessionToken })

    const funcs = parseUsers.map(parseUser => new Promise(async (resolve, reject) => {
      const studyQuery = new Parse.Query(Study)
      studyQuery.equalTo('user', parseUser)
      studyQuery.notEqualTo('state', 'DELETED')
      studyQuery.limit(100000)
      const parseStudies = await studyQuery.find({ sessionToken: robotUser.sessionToken })

      const studies = parseStudies.map(s => s.toJSON())

      const totalViews = studies.reduce((acc, study) => {
        acc += study.views // eslint-disable-line
        return acc
      }, 0)

      const totalStars = studies.reduce((acc, study) => {
        acc += study.stars // eslint-disable-line
        return acc
      }, 0)

      const viewsThisWeek = studies.reduce((acc, study) => {
        if (study.analytics) {
          if (dateBucket in study.analytics.views) {
            acc += study.analytics.views[dateBucket] // eslint-disable-line
          }
        }
        return acc
      }, 0)

      const starsThisWeek = studies.reduce((acc, study) => {
        if (study.analytics) {
          if (dateBucket in study.analytics.stars) {
            acc += study.analytics.stars[dateBucket] // eslint-disable-line
          }
        }
        return acc
      }, 0)

      const mostViewedAllTime = studies.sort(compareViewsAllTime).slice(0, 3)
      const mostViewedThisWeek = studies.sort(compareViewsThisWeek).slice(0, 3)

      const analytics = {
        totalViews,
        viewsThisWeek,
        totalStars,
        starsThisWeek
      }

      if (mostViewedAllTime[0]) {
        analytics.mostViewedAllTimeName0 = mostViewedAllTime[0].name
        analytics.mostViewedAllTimeDescription0 = mostViewedAllTime[0].description
        analytics.mostViewedAllTimePreview0 = mostViewedAllTime[0].preview && mostViewedAllTime[0].preview.url
      }

      if (mostViewedAllTime[1]) {
        analytics.mostViewedAllTimeName1 = mostViewedAllTime[1].name
        analytics.mostViewedAllTimeDescription1 = mostViewedAllTime[1].description
        analytics.mostViewedAllTimePreview1 = mostViewedAllTime[1].preview && mostViewedAllTime[1].preview.url
      }

      if (mostViewedAllTime[2]) {
        analytics.mostViewedAllTimeName2 = mostViewedAllTime[2].name
        analytics.mostViewedAllTimeDescription2 = mostViewedAllTime[2].description
        analytics.mostViewedAllTimePreview2 = mostViewedAllTime[2].preview && mostViewedAllTime[2].preview.url
      }

      if (mostViewedThisWeek[0]) {
        analytics.mostViewedThisWeekName0 = mostViewedThisWeek[0].name
        analytics.mostViewedThisWeekDescription0 = mostViewedThisWeek[0].description
        analytics.mostViewedThisWeekPreview0 = mostViewedThisWeek[0].preview && mostViewedThisWeek[0].preview.url
      }

      if (mostViewedThisWeek[1]) {
        analytics.mostViewedThisWeekName1 = mostViewedThisWeek[1].name
        analytics.mostViewedThisWeekDescription1 = mostViewedThisWeek[1].description
        analytics.mostViewedThisWeekPreview1 = mostViewedThisWeek[1].preview && mostViewedThisWeek[1].preview.url
      }

      if (mostViewedThisWeek[2]) {
        analytics.mostViewedThisWeekName2 = mostViewedThisWeek[2].name
        analytics.mostViewedThisWeekDescription2 = mostViewedThisWeek[2].description
        analytics.mostViewedThisWeekPreview2 = mostViewedThisWeek[2].preview && mostViewedThisWeek[2].preview.url
      }

      // console.log({
      //   name: parseUser.get('nickname'),
      //   ...analytics
      // })

      mixpanel.people.set(parseUser.get('nickname'), analytics, {
        $ignore_time: true
      }, (err) => {
        if (err) return reject()
        resolve()
      })
    }))
    await Promise.all(funcs)
  } catch (err) {
    console.error(err)
  }
}
