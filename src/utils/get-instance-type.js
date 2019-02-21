
module.exports = (type) => {
  let standardType = null
  let numGPUs = 0
  if (type === 's1') standardType = 'n1-standard-1'
  if (type === 'm1') standardType = 'n1-standard-4'
  if (type === 'l1') standardType = 'n1-standard-16'

  if (type.split('-').length === 2) {
    if (type.split('-')[0] === 's1') standardType = 'n1-standard-1'
    if (type.split('-')[0] === 'm1') standardType = 'n1-standard-4'
    if (type.split('-')[0] === 'l1') standardType = 'n1-standard-16'
    if (type.split('-')[1] === 'g1') numGPUs = 1
    if (type.split('-')[1] === 'g2') numGPUs = 2
  }

  return { standardType, numGPUs }
}
