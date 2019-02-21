const { Parse, Study } = require('../parse-rest')
const fs = require('fs')
const uploadToParse = require('../utils/upload-to-parse')

const setStudyPreview = async ({ user, studyId, filepath }) => {
  const query = new Parse.Query(Study)
  const parseStudy = await query.get(studyId, { sessionToken: user.sessionToken })

  const upload = await uploadToParse({ user, path: filepath, name: filepath.replace('/tmp/', '') })

  const _upload = Parse.File.fromJSON(upload)
  parseStudy.set('preview', _upload)
  
  await parseStudy.save(null, { sessionToken: user.sessionToken })
  return parseStudy.toJSON()
}

setStudyPreview.handler = async (req, res, next) => {
  try {
    const user = req.user

    const body = JSON.parse(req.headers.body)
    const { studyId } = body

    const filepath = `/tmp/${studyId}-preview.jpg`
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filepath)
      req.pipe(stream)
      stream.on('close', () => resolve())
      stream.on('error', (error) => reject(error))
    })

    res.send(await setStudyPreview({ user, studyId, filepath }))
  } catch (err) {
    next(err)
  }
}

module.exports = setStudyPreview
