'use strict'

require('dotenv').config()

const program = require('commander')
const signIn = require('./sign_in')
const downloadSeries = require('./download')

program.parse(process.argv)

if (program.args.length === 0) {
  return console.error("Pass an url to an egghead series")
}

const seriesUrl = program.args[0]

signIn({
  email: process.env.EMAIL,
  password: process.env.PASSWORD
})
  .then(() => downloadSeries(seriesUrl))
  .then(() => {
    console.log("\n✓ All Done")
  })
