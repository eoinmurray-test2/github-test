const { exec } = require('child_process')

const execPromise = (cmd, opts) => new Promise((resolve, reject) => {
  exec(cmd, opts, (err, stdout, stderr) => {
    if (err) return reject(err)
    return resolve({ stdout, stderr })
  })
})

module.exports = async (cwd) => {
  try {
    const origin = (await execPromise('git config --get remote.origin.url', { cwd })).stdout.trim()
    const branch = (await execPromise('git rev-parse --abbrev-ref HEAD'), { cwd }).stdout.trim()
    const commit = (await execPromise('git rev-parse HEAD'), { cwd }).stdout.trim()

    return {
      url: origin,
      branch,
      commit
    }
  } catch (e) {
    return null
  }
}
