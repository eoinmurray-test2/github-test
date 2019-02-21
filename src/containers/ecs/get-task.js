const ecs = require('./ecs')

module.exports = async ({ cluster, taskArn }) => {
  const params = {
    tasks: [taskArn],
    cluster
  }

  const result = await ecs.describeTasks(params).promise()
  if (result.tasks.length > 0) return result.tasks[0]
  return null
}
