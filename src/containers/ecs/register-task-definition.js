const ecs = require('./ecs')

const plans = require('../../plans')

const taskDefinition = ({ containerAlias, user }) => {
  const taskDef = {
    family: `kyso-jupyterlab-${containerAlias}-${Math.random().toString(36).substring(7)}`,
    networkMode: 'host',
    cpu: plans(user.plan).cpu,
    memory: plans(user.plan).memory,
    containerDefinitions: [{
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': '/ecs/jupyterlab',
          'awslogs-region': 'us-east-1',
          'awslogs-stream-prefix': 'ecs'
        }
      },
      user: 'root',
      name: `${containerAlias}`,
      image: '858604803370.dkr.ecr.us-east-1.amazonaws.com/kyso/jupyterlab:latest',
      command: [
        '/usr/local/bin/start-notebook.sh',
        '--NotebookApp.token=""',
        '--Application.log_level="DEBUG"',
        '--LabApp.override_static_url="https://d2yxburkq0qq6r.cloudfront.net/"'
      ],
      portMappings: [{
        hostPort: 8888,
        containerPort: 8888,
        protocol: 'tcp'
      }],
      mountPoints: [
        {
          readOnly: null,
          containerPath: '/home/jovyan',
          sourceVolume: "mnt"
        }
      ],
      environment: [
        { name: 'CHOWN_HOME', value: 'yes' },
        { name: 'JUPYTER_ENABLE_LAB', value: 'yes' },
        { name: 'NB_GID', value: '500' },
        { name: 'NB_UID', value: '500' },
        { name: 'GRANT_SUDO', value: 'yes' }
      ],
    }],
    volumes: [
      {
        name: 'mnt',
        host: {
          sourcePath: `/efs/${containerAlias}`
        },
        dockerVolumeConfiguration: null
      }
    ]
  }

  return taskDef
}

module.exports = async ({ containerAlias, user }) => {
  const params = taskDefinition({ containerAlias, user })
  await ecs.registerTaskDefinition(params).promise()
  return params.family
}
