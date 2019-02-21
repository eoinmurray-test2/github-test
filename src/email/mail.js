const Mailgun = require('mailgun-js')

const mailgun = new Mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_EMAIL_DOMAIN,
})

const sendMail = async (message) => mailgun.messages().send(message)

module.exports = async ({ to, subject, text, from = 'support@kyso.io' }) => {
  const message = {
    from,
    to,
    subject,
    html: text
  }

  return sendMail(message)
}
