const ecs = require('./ecs/ecs')
const getContainer = require('./get-container')
const getRobotUser = require('../auth/get-robot-user')
const stopTask = require('./ecs/stop-task')
const deregisterTaskDefinition = require('./ecs/deregister-task-definition')

const stopDanglingContainers = async () => {
  const robot = await getRobotUser()

  const taskData = await ecs.listTasks({ cluster: 'jupyterlab' }).promise()
  const tasksDesc = await ecs.describeTasks({ cluster: 'jupyterlab', tasks: taskData.taskArns }).promise()

  tasksDesc.tasks.forEach(async (task) => {
    if (task.containers[0].name === 'proxy-server') {
      return
    }

    const container = await getContainer({
      user: robot,
      taskArn: task.taskArn
    })

    if (container === null) {
      const _task = await stopTask({ task: task.taskArn, cluster: 'jupyterlab' })
      await deregisterTaskDefinition({ taskDefinition: _task.taskDefinitionArn })
    }
  })
}

module.exports = stopDanglingContainers
