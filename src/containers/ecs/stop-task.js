const ecs = require('./ecs')

module.exports = async ({ task, cluster }) => {
  const params = {
    cluster,
    task
  }

  const result = await ecs.stopTask(params).promise()
  return result.task
}
