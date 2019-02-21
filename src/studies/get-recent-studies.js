const ms = require('ms')
const mongo = require('../mongo')
const logger = require('../logger')

const getRecentStudies = async ({ tags = null, splitByTags = false, page = 0, limit = 30, sessionToken = null }) => {
  const db = await mongo()
  const start = new Date()
  let _studies

  if (!tags) {
    _studies = await db.Studies
      .aggregate([
        { $match: { state: { $ne: 'DELETED' } } },
        ...mongo.includeField({ field: 'user', from: '_User' }),
      ])
      .sort({ _created_at: -1 })
      .skip(page * limit)
      .limit(limit)
      .toArray()
  }

  if (tags && splitByTags) {
    const funcs = tags.map((tag) =>
      db.Studies
        .aggregate([
          {
            $match: {
              state: { $ne: 'DELETED' },
              tags: { $in: [tag] }
            }
          },
          ...mongo.includeField({ field: 'user', from: '_User' }),
        ])
        .sort({ _created_at: -1 })
        .skip(page * limit)
        .limit(limit)
        .toArray()
    )

    const arrays = await Promise.all(funcs)
    _studies = [].concat.apply([], arrays)
  }

  if (tags && !splitByTags) {
    _studies = await db.Studies
      .aggregate([
        {
          $match: {
            state: { $ne: 'DELETED' },
            tags: { $all: tags }
          }
        },
        ...mongo.includeField({ field: 'user', from: '_User' }),
      ])
      .sort({ _created_at: -1 })
      .skip(page * limit)
      .limit(limit)
      .toArray()
  }

  const studyTime = ms(new Date() - start)
  const studies = _studies.map((study) => mongo.formatObject(study, 'Study')).filter(s => !!s.user)
  logger.debug({ studyTime })

  if (splitByTags) {
    const collections = studies.reduce((acc, study) => {
      study.tags.forEach(tag => {
        if (tags.includes(tag)) {
          if (!acc[tag]) acc[tag] = []
          acc[tag].push(study)
        }
      })
      return acc
    }, {})
    return collections
  }

  return studies
}

getRecentStudies.handler = async (req, res, next) => {
  try {
    const { tags, page, limit, splitByTags } = req.body
    res.send(await getRecentStudies({ tags, page, limit, splitByTags }))
  } catch (err) {
    next(err)
  }
}

module.exports = getRecentStudies
