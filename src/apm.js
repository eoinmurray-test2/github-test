const tracer = require('dd-trace').init({
  service: 'kyso-api'
})

tracer.use('express')
