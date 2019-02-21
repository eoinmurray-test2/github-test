const ms = require('ms')
const mongo = require('../mongo')
const logger = require('../logger')

const getExploreStudies = async ({ page = 0, limit = 30 } = {}) => {
  const db = await mongo()
  let start = new Date()
  const _role = await db.Roles.findOne({ name: `kyso` })
  const role = mongo.formatObject(_role)
  const roleTime = ms(new Date() - start)

  start = new Date()
  const joins = await db.collection('_Join:users:_Role').find({ owningId: role.objectId }).toArray()
  const joinTime = ms(new Date() - start)

  start = new Date()
  const _studies = await db.Studies
    .aggregate([
      {
        $match: {
          stargazers: {
            $elemMatch: { objectId: { $in: joins.map(j => j.relatedId) } }
          },
          state: { $ne: 'DELETED' }
        }
      },
      // ...mongo.includeList({ field: 'versionsArray', from: 'Version' }),
      ...mongo.includeField({ field: 'user', from: '_User' }),
    ])
    .sort({ _created_at: -1 })
    .skip(page * limit)
    .limit(limit)
    .toArray()

  const studyTime = ms(new Date() - start)

  const studies = _studies.map((study) => mongo.formatObject(study, 'Study'))
  logger.debug({ roleTime, joinTime, studyTime })
  return studies
}

getExploreStudies.handler = async (req, res, next) => {
  try {
    const { page, limit } = req.body
    res.send(await getExploreStudies({ page, limit }))
  } catch (err) {
    next(err)
  }
}

module.exports = getExploreStudies
