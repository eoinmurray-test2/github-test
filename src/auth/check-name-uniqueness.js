const { Parse } = require('../parse-rest')

const checkNameUniqueness = async ({ name }) => {
  const query = new Parse.Query(Parse.User)
  query.equalTo('nickname', name)
  const count = await query.count()
  if (count === 0) {
    return { unique: true }
  }

  return { unique: false }
}

checkNameUniqueness.handler = async (req, res, next) => {
  try {
    const { name } = req.body
    res.send(await checkNameUniqueness({ name }))
  } catch (err) {
    next(err)
  }
}

module.exports = checkNameUniqueness
