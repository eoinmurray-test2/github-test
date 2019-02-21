const AWS = require('aws-sdk')

const ec2 = new AWS.EC2({
  region: process.env.AWS_REGION || process.env.AWS_REGION_1,
  accessKeyId: process.env.AWS_ECS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ECS_SECRET_KEY,
})

module.exports = ec2
