'use strict'

const request = require('request')
const cheerio = require('cheerio')

const get = (callback) => {
  return request("https://egghead.io/users/sign_in", function(error, response, html) {
    var $, token
    $ = cheerio.load(html)
    token = $('input[name=authenticity_token]').val()
    return callback(token)
  })
}

const post = (token, callback) => {
  console.log("signing in as " + process.env.EMAIL)
  return request.post("https://egghead.io/users/sign_in", {
    form: {
      "utf8": "✓",
      "authenticity_token": token,
      "user[email]": process.env.EMAIL,
      "user[password]": process.env.PASSWORD
    }
  }, callback)
}

module.exports = (callback) => {
  return get((token) => {
    return post(token, callback)
  })
}
