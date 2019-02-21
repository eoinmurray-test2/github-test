
const isAdmin = () => true

isAdmin.handler = async (req, res, next) => {
  try {
    res.send(isAdmin())
  } catch (err) {
    next(err)
  }
}

module.exports = isAdmin
