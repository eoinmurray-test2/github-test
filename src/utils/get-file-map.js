const getFiles = require('./get-files')
const { hash } = require('./hash')

const SEP = process.platform.startsWith('win') ? '\\' : '/'

const getFileList = async (dir, pkg) => {
  const fileList = await getFiles(dir, pkg)
  const hashes = await hash(fileList)

  const files = await Promise.all(Array.prototype.concat.apply([],
    await Promise.all(Array.from(hashes).map(async ([sha, { data, names }]) =>
      names.map(async name => ({
        sha,
        size: data.length,
        file: toRelative(name, dir),
        name: toRelative(name, dir)
      }))
    ))
  ))
  return files
}

const toRelative = (_path, base) => {
  const fullBase = base.endsWith(SEP) ? base : base + SEP
  let relative = _path.substr(fullBase.length)

  if (relative.startsWith(SEP)) {
    relative = relative.substr(1)
  }

  return relative.replace(/\\/g, '/')
}

module.exports = { getFileList, toRelative }
