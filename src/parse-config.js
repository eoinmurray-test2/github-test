const S3Adapter = require('@parse/s3-files-adapter')
const MailgunAdapter = require('@parse/simple-mailgun-adapter')

const bucket = 'kyso-user-files-east'

class EmptyLoggerAdapter {
  constructor(options) {} // eslint-disable-line
  log(level, message) {} // eslint-disable-line
}

const PARSE_SETTINGS = {
  appName: 'Kyso.io',
  appId: process.env.PARSE_APP_ID,
  masterKey: process.env.PARSE_MASTER_KEY,
  fileKey: process.env.PARSE_FILE_KEY,
  serverURL: `${process.env.API_URL}/parse`,
  maxUploadSize: '50000000mb',
  databaseURI: process.env.DATABASE_URI,
  filesAdapter: new S3Adapter({
    bucket,
    region: 'us-east-1',
    globalCacheControl: 'public, max-age=86400',
    directAccess: true,
    baseUrl: process.env.KYSO_FILES_CLOUDFRONT_URL,
  }),
  emailAdapter: MailgunAdapter({
    fromAddress: 'support@kyso.io',
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_EMAIL_DOMAIN
  }),
  bucket,
  logsFolder: null,
  logLevel: null,
  loggerAdapter: EmptyLoggerAdapter,
  silent: true,
  verifyUserEmails: false,
  emailVerifyTokenValidityDuration: 24 * 60 * 60,
  publicServerURL: `${process.env.API_URL}/parse`
}

module.exports = PARSE_SETTINGS
