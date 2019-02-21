const fs = require('fs-extra')
const fetch = require('node-fetch')
const decompress = require('decompress')
const Octokit = require('@octokit/rest')
const { Parse, Study } = require('../parse-rest')
const prepareFiles = require('../utils/prepare-files')
const createVersion = require('../studies/create-version')

const githubHook = async ({ event }) => {
  /*
    TODO:
    can check the sender Id against a user githubId
    and the import the `repository` in the normal way
    using the import-github-repository function,
    just need to communicate the need, and then check,
    for the kyso.json file.
  */

  let error = null
  let study
  let repository
  let extractedDir
  let zipTarget
  let main
  let files
  let message
  let commitSha
  try {
    const headCommit = event.head_commit
    repository = event.repository

    let eventBranch = 'master'
    if (event.ref) {
      eventBranch = event.ref.split('/').slice(-1)[0]
    }

    const query = new Parse.Query(Study)
    query.equalTo('githubId', repository.id)
    query.include('user')

    const studies = await query.find({ useMasterKey: true })

    if (!studies.length) {
      throw new Error('This repo is not connected on Kyso')
    }

    const parseStudy = studies[0]
    study = parseStudy.toJSON()

    console.log(study)

    const token = study.user.accessToken

    if (!headCommit) {
      const octokit = new Octokit({
        auth: `token ${token}`
      })

      const commits = await octokit.repos.listCommits({
        owner: repository.owner.login,
        repo: repository.name
      })

      if (!commits.data.length) {
        throw new Error('This repo has no commits')
      }

      commitSha = commits.data[0].sha
      message = commits.data[0].commit.message
    } else {
      message = headCommit.message
      commitSha = headCommit.id
    }

    zipTarget = `/tmp/${commitSha}.zip`
    const zipUrl = repository.archive_url.replace('{archive_format}{/ref}', `zipball/${commitSha}`)

    let headers = {}
    if (token) {
      headers = {
        Authorization: `token ${token}`
      }
    }

    const res = await fetch(zipUrl, { headers })

    await new Promise((resolve) => {
      const stream = fs.createWriteStream(zipTarget, { autoClose: true })
      res.body.pipe(stream)
      stream.on('close', resolve)
    })

    files = await decompress(zipTarget, `/tmp`)

    const extractedDirName = files[0].path
    extractedDir = `/tmp/${extractedDirName}`
    files.shift()
    files = files
      .map(file => {
        file.path = file.path.replace(extractedDirName, '') // eslint-disable-line
        return file
      })
      .filter(file => file.type === 'file')

    let kysofile = files.find(file => file.path === 'kyso.json')
    if (kysofile) {
      kysofile = JSON.parse(kysofile.data.toString())
    }

    main = kysofile ? kysofile.main : null
    const branch = kysofile ? kysofile.branch : null
    const description = kysofile ? kysofile.description : null
    const title = kysofile ? kysofile.title : null

    if (branch && eventBranch !== branch) {
      const err = new Error(`kyso.json specifies ${branch} branch but commit was to ${eventBranch}`)
      err.type = 'SKIPPED'
      throw err
    }

    if (description) {
      parseStudy.set('description', description)
      await parseStudy.save(null, { useMasterKey: true })
    }

    if (title) {
      parseStudy.set('title', title)
      await parseStudy.save(null, { useMasterKey: true })
    }
  } catch (err) {
    error = err.message
    if (err.type) {
      error = {
        type: err.type,
        message: err.message
      }
    }

    console.error(err)
  }

  if (!study) return console.log('cannot find study')

  const { fileMap, versionHash } = await prepareFiles(files)
  const version = await createVersion({
    user: study.user,
    sha: versionHash,
    name: repository.name,
    main,
    message,
    error,
    tarPath: zipTarget,
    fileMap,
    dir: extractedDir,
    githubImport: true,
    commitSha
  })

  return version
}

githubHook.handler = async (req, res, next) => {
  try {
    const event = req.body
    res.send(await githubHook({ event }))
  } catch (err) {
    next(err)
  }
}


module.exports = githubHook
