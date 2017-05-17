'use strict'

const request = require('request-promise-native')
const cheerio = require('cheerio')

const getAuthToken = () => {
  return request('https://egghead.io/users/sign_in', {
    jar: true,
    rejectUnauthorized: false,
    followAllRedirects: true
  })
    .then(html => {
      const $ = cheerio.load(html)
      const token = $('input[name=authenticity_token]').val()
      return token
    })
    .catch(e =>{
      console.error('Error getting auth token', e)
      throw e
    })
}

const doLogin = ({ email, password }, token) => {
  console.log(`signing in as ${email}`)
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
  .catch(e => {
    console.error('Error during signin', e)
    throw e
  })
}

module.exports = credentials => getAuthToken()
  .then(token => doLogin(credentials, token))
