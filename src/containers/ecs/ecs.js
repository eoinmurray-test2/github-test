const AWS = require('aws-sdk')

const ecs = new AWS.ECS({
  region: process.env.AWS_REGION || process.env.AWS_REGION_1,
  accessKeyId: process.env.AWS_ECS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ECS_SECRET_KEY,
})

module.exports = ecs
