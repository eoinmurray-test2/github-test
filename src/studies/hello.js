
const hello = (name) => {
  return { message: `hello ${name}`}
}

hello.handler = async (req, res, next) => {
  const name = req.body.name
  const value = hello(name)
  res.send(value)
}

module.exports = hello