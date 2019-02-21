const Mixpanel = require('mixpanel')

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN)

const track = (evt, data) => {
  mixpanel.track(evt, data)
}

module.exports = {
  mixpanel,
  track
}
