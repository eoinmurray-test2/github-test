const ecs = require('./ecs')

module.exports = async ({ cluster, containerInstanceArn }) => {
  const params = {
    cluster,
    containerInstances: [containerInstanceArn]
  }

  const result = await ecs.describeContainerInstances(params).promise()

  if (result.containerInstances.length > 0) return result.containerInstances[0]
  return null
}
