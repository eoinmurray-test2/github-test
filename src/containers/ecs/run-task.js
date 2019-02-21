const ecs = require('./ecs')

module.exports = async ({ cluster, taskDefinitionName }) => {
  const params = {
    cluster,
    taskDefinition: taskDefinitionName,
    placementStrategy: [
      {
        field: "cpu",
        type: "binpack"
      }
    ]
  }

  const result = await ecs.runTask(params).promise()

  if (result.tasks.length > 0) return result.tasks[0]
  if (result.failures.length > 0) throw new Error(result.failures[0].reason)
  return null
}
