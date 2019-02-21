
const getMe = ({ user }) => user

getMe.handler = async (req, res, next) => {
  try {
    const user = req.user
    res.send(getMe({ user }))
  } catch (err) {
    next(err)
  }
}

module.exports = getMe
