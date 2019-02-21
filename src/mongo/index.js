/*
  Query docs

  https://docs.mongodb.com/manual/reference/operator/query/
*/

const MongoClient = require('mongodb').MongoClient
const schemas = require('./schemas')
const logger = require('../logger')

let client = null

const mongo = async () => {
  if (client) {
    return client.db(client.s.databaseName)
  }

  client = await MongoClient.connect(process.env.DATABASE_URI, { poolSize: 1000000000 })
  const db = client.db(client.s.databaseName)

  if (!db) throw new Error(`Cannot connect to database`)

  db.Users = db.collection('_User')
  db.Sessions = db.collection('_Session')
  db.Containers = db.collection('Container')
  db.Studies = db.collection('Study')
  db.Versions = db.collection('Version')
  db.Files = db.collection('File')
  db.Teams = db.collection('Team')
  db.Tags = db.collection('Tag')
  db.Roles = db.collection('_Role')
  db.RoleJoins = db.collection('_Join:users:_Role')

  return db
}

mongo.close = () => {
  if (client) client.close()
}

mongo.getClient = () => client

mongo.formatObject = (obj, className = null) => {
  let schema = null
  if (className in schemas) schema = schemas[className]

  if (!obj.hasOwnProperty('_id')) return obj

  const formattedObject = {}

  Object.keys(obj).forEach(key => {
    if (!key.startsWith('_')) {
      formattedObject[key] = obj[key]

      if (schema) {
        if (key in schema) {
          if (schema[key] === "file") {
            formattedObject[key] = { url: `${process.env.KYSO_FILES_CLOUDFRONT_URL}/${obj[key]}` }
          }
        }
      }

      if ((typeof obj[key] === "object") && (obj[key] !== null)) {
        formattedObject[key] = mongo.formatObject(obj[key])
      }

      if (Array.isArray(obj[key])) {
        formattedObject[key] = obj[key].map(mongo.formatObject)
      }
    }
  })

  formattedObject.objectId = obj._id
  formattedObject.createdAt = obj._created_at
  formattedObject.updatedAt = obj._updated_at

  formattedObject.ACL = Object.keys(obj._acl).reduce((acc, curVal) => {
    acc[curVal] = {}
    if (obj._acl[curVal].w) acc[curVal].write = true
    if (obj._acl[curVal].r) acc[curVal].read = true
    return acc
  }, {})

  if (obj._session_token) formattedObject.sessionToken = obj._session_token

  return formattedObject
}

mongo.includeList = ({ field, from }) => (
  [
    { $unwind: `$${field}` },
    { $addFields: { carryId: `$${field}.objectId` } },
    {
      $lookup: {
        from,
        localField: 'carryId',
        foreignField: '_id',
        as: 'listAnchor'
      }
    },
    {
      $group: {
        _id: "$_id",
        body: {
          $first: "$$ROOT"
        },
        carryList: {
          $push: { $arrayElemAt: ["$listAnchor", 0] }
        }
      }
    },
    {
      $addFields: {
        [`body.${field}`]: "$carryList"
      }
    },
    { $replaceRoot: { newRoot: "$body" } },
    { $project: { carryId: 0, carryList: 0, listAnchor: 0 } }
  ]
)

mongo.includeField = ({ field, from }) => (
  [
    {
      $addFields: {
        carryId: {
          $arrayElemAt: [{ $split: [`$_p_${field}`, `${from}$`] }, 1]
        },
      }
    },
    {
      $lookup: {
        from,
        localField: 'carryId',
        foreignField: '_id',
        as: `${field}`
      }
    },
    { $unwind: `$${field}` },
    { $project: { carryId: 0 } }
  ]
)

mongo.getRolesForUser = async (user) => {
  const db = await mongo()
  const roles = await db.RoleJoins.aggregate([
    { $match: {
      relatedId: user.objectId,
    } },
    { $lookup: {
      from: '_Role',
      localField: 'owningId',
      foreignField: '_id',
      as: 'role'
    } },
    { $match: {
      role: { $exists: true, $ne: [] }
    } },
    { $replaceRoot: { newRoot: { $arrayElemAt: ['$role', 0] } } }
  ]).toArray()

  return roles.map(role => mongo.formatObject(role))
}


mongo.graceful = () => new Promise(resolve => {
  if (client) {
    logger.debug(`Gracefully closing Mongodb connections`)
    client.close(true, resolve)
    logger.debug(`Closed Mongodb connections`)
  } else {
    resolve()
  }
})

module.exports = mongo
