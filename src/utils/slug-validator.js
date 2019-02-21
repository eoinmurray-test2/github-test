

const re = new RegExp("^[a-z0-9]+(?:-[a-z0-9]+)*$")

module.exports = (string) => re.test(string) && string.length > 1
