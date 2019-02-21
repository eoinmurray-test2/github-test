const ec2 = require('./ec2')

module.exports = async ({ instanceId }) => {
  const params = {
    InstanceIds: [instanceId]
  }

  const result = await ec2.describeInstances(params).promise()


  if (result.Reservations.length > 0) {
    if (result.Reservations[0].Instances.length > 0) {
      return result.Reservations[0].Instances[0]
    }
  }

  return null
}
