const ecs = require('./ecs')

module.exports = async ({ taskDefinition }) => {
  const result = await ecs.deregisterTaskDefinition({ taskDefinition }).promise()
  return result.taskDefinition
}
