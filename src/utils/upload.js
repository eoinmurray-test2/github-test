const path = require('path')
const fs = require('fs-extra')
const { createHash } = require('crypto')
const uploadToParse = require('./upload-to-parse')
const { Parse, File } = require('../parse-rest')

const uploadFiles = async ({ user, study, fileMap, dir, useMasterKey = false }) =>
  Promise.all(Object.keys(fileMap).map(async (nameSha) => {
    const fileName = fileMap[nameSha]
    return uploadFile({ user, study, fileName, dir, useMasterKey })
  }))

const uploadFile = async ({ user, study, fileName, dir, useMasterKey = false }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  const fpath = path.join(dir, fileName)
  const buf = await fs.readFile(fpath)
  const size = buf.length

  const fileSha = createHash('sha1').update(buf).digest('hex')

  const fileQuery = new Parse.Query(File)
  fileQuery.equalTo('sha', fileSha)
  fileQuery.equalTo('study', study)

  let fileResults
  if (useMasterKey) {
    fileResults = await fileQuery.find({ useMasterKey: true })
  } else {
    fileResults = await fileQuery.find({ sessionToken: user.sessionToken })
  }

  // if (fileResults.length > 0) {
  //   return fileResults[0]
  // }

  const file = new File()

  if (size > 0) {
    const upload = await uploadToParse({ user, path: fpath, name: `${fileSha}${path.extname(fileName)}` })
    file.set('file', Parse.File.fromJSON(upload))
  }

  file.set('name', fileName)
  file.set('size', size)
  file.set('user', parseUser)
  file.set('study', study)
  file.set('sha', fileSha)
  file.setACL(study.getACL())

  if (useMasterKey) {
    await file.save(null, { useMasterKey: true })
  } else {
    await file.save(null, { sessionToken: user.sessionToken })
  }

  return file
}

module.exports = {
  uploadFile,
  uploadFiles
}
