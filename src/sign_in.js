import request from 'request-promise-native'
import cheerio from 'cheerio'

export const signIn = async (credentials) => {
  try {
  const token = await getAuthToken()
  return doLogin(credentials, token)
  } catch(e) {
    console.error('Error during signIn')
    console.error(e)
    throw e
  }
}

const getAuthToken = async () => {
  const html = await request('https://egghead.io/users/sign_in', {
    jar: true,
    rejectUnauthorized: false,
    followAllRedirects: true
  })
  const $ = cheerio.load(html)
  const token = $('input[name=authenticity_token]').val()
  return token
}

const doLogin = ({ email, password }, token) => {
  console.log(`Signing in as ${email}`)
  return request.post('https://egghead.io/users/sign_in', {
    jar: true,
    rejectUnauthorized: false,
    followAllRedirects: true,
    form: {
      'utf8': '✓',
      'user[email]': email,
      'user[password]': password,
      'authenticity_token': token
    }
  })
}

