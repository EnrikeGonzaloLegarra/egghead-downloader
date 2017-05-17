'use strict'

require('dotenv').config()

const request = require('request')
const program = require('commander')
const signIn = require('./sign_in')
const downloadSeries = require('./download')

request.defaults({
  jar: true,
  rejectUnauthorized: false,
  followAllRedirects: true
})

program.parse(process.argv)

if (program.args.length === 0) {
  return console.error("Pass a url to an egghead series")
}

signIn(() => {
  return downloadSeries(program.args[0], () => {
    console.log("\n✓ All Done")
  })
})
