const { Parse, Team } = require('../parse-rest')
const getTeam = require('../auth/get-team')
const getUser = require('../auth/get-user')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const checkoutNewTeam = async ({ user, teamname, billingEmail, source, interval = 'monthly' }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const existingTeam = await getTeam({ user, name: teamname })
  if (existingTeam) {
    const err = new Error('This name is already taken.')
    err.code = 403
    throw err
  }

  const existingUser = await getUser({ nickname: teamname })
  if (existingUser) {
    const err = new Error('This name is already taken.')
    err.code = 403
    throw err
  }

  let planId = 'plan_EQWe2qkW1QhEX0' // monthly
  if (interval === 'yearly') {
    planId = 'plan_EQWf4qoBLlaXNu'
  }

  const customer = await stripe.customers.create({
    email: billingEmail,
    description: `Customer for team: ${teamname} (${billingEmail})`,
    source
  })

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ plan: planId, quantity: 5 }]
  })

  const roleACL = new Parse.ACL()

  roleACL.setWriteAccess(parseUser, true)
  roleACL.setPublicReadAccess(false)
  roleACL.setPublicWriteAccess(false)

  const admins = new Parse.Role(`${teamname}-admins`, roleACL)
  admins.getUsers().add(parseUser)
  await admins.save(null, { sessionToken: user.sessionToken })

  roleACL.setWriteAccess(parseUser, false)
  roleACL.setRoleWriteAccess(admins, true)
  roleACL.setRoleReadAccess(admins, true)

  const editors = new Parse.Role(`${teamname}-editors`, roleACL)
  await editors.save(null, { sessionToken: user.sessionToken })

  const viewers = new Parse.Role(`${teamname}-viewers`, roleACL)
  await viewers.save(null, { sessionToken: user.sessionToken })


  roleACL.setPublicReadAccess(false)
  roleACL.setPublicWriteAccess(false)
  roleACL.setRoleWriteAccess(admins, true)
  roleACL.setRoleReadAccess(admins, true)
  roleACL.setRoleReadAccess(editors, true)
  roleACL.setRoleReadAccess(viewers, true)
  admins.setACL(roleACL)
  editors.setACL(roleACL)
  viewers.setACL(roleACL)
  admins.getUsers().add(parseUser)
  editors.getRoles().add(admins)
  viewers.getRoles().add(admins)

  await admins.save(null, { sessionToken: user.sessionToken })
  await editors.save(null, { sessionToken: user.sessionToken })
  await viewers.save(null, { sessionToken: user.sessionToken })


  const parseTeam = new Team()
  parseTeam.set('name', teamname)
  const teamACL = new Parse.ACL()
  teamACL.setPublicReadAccess(false)
  teamACL.setPublicWriteAccess(false)
  teamACL.setRoleReadAccess(admins, true)
  teamACL.setRoleReadAccess(editors, true)
  teamACL.setRoleReadAccess(viewers, true)
  teamACL.setRoleWriteAccess(admins, true)
  parseTeam.set('admins', admins)
  parseTeam.set('editors', editors)
  parseTeam.set('viewers', viewers)
  parseTeam.set('billingEmail', billingEmail)
  parseTeam.set('subscriptionId', subscription.id)
  parseTeam.setACL(teamACL)
  await parseTeam.save(null, { sessionToken: user.sessionToken })

  // parseUser.addUnique('teams', parseTeam)
  // parseUser.save(null, { sessionToken: user.sessionToken })

  return parseTeam.toJSON()
}

checkoutNewTeam.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { teamname, interval, billingEmail, plan, source } = req.body
    res.send(await checkoutNewTeam({ user, interval, teamname, billingEmail, plan, source }))
  } catch (err) {
    next(err)
  }
}

module.exports = checkoutNewTeam
