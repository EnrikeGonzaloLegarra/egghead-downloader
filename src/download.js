'use strict'

const https = require('https')
const fs = require('fs')
const url = require('url')
const path = require('path')
const mkdirp = require('mkdirp')
const async = require('async')
const cheerio = require('cheerio')
const os = require('os')
const request = require('request')

const downloadSeries = (url, callback) => {
  return fetchLinks(url, function(links) {
    var threadCount
    threadCount = os.cpus().length
    return async.eachLimit(links, threadCount, function(link, next) {
      return downloadVideo(link, next)
    }, callback)
  })
}

const fetchLinks = (url, callback) => {
  var parts, series
  parts = url.split('/')
  series = parts[parts.length - 1]
  console.log("Fetching: " + url)
  return request(url, function(error, response, html) {
    var $, links
    $ = cheerio.load(html)
    links = []
    $('a.flex.bg-white').each(function(index, link) {
      index = ('0' + (index + 1)).substr(-2)
      return links.push({
        href: $(this).attr('href'),
        series: series,
        index: index
      })
    })
    return callback(links)
  })
}

const downloadVideo = (link, callback) => {
  return getVideoPaths(link, function(error) {
    console.log("error: " + error)
    return callback()
  }, function(videoUrl, filePath) {
    return writeFile(videoUrl, filePath, callback)
  })
}

const getVideoPaths = (link, err, next) => {
  console.log("fetching: " + link.href)
  return request(link.href, function(error, response, html) {
    var fileName, filePath, id, videoUrl
    if (error) {
      return err(error)
    }
    if (html.indexOf('This lesson is for PRO members.') > -1) {
      return err('This lesson is for PRO members.')
    }
    id = getVideoID(html)
    videoUrl = "https://embedwistia-a.akamaihd.net/deliveries/" + id + "/file.mp4"
    fileName = path.basename(url.parse(link.href).pathname) + '.mp4'
    filePath = "videos/" + link.series + "/" + link.index + "-" + fileName
    mkdirp.sync("videos/" + link.series)
    return next(videoUrl, filePath)
  })
}

const getVideoID = (html) => {
  var $, contentUrl, contentUrlMatch, regex, thumbnailUrl, thumbnailUrlMatch
  $ = cheerio.load(html)
  contentUrl = $("meta[itemprop=contentURL]").attr('content')
  thumbnailUrl = $("meta[itemprop=thumbnailUrl]").attr('content')
  regex = /deliveries\/(.*)+\.bin/
  contentUrlMatch = contentUrl.match(regex)
  thumbnailUrlMatch = thumbnailUrl.match(regex)
  if (contentUrlMatch) {
    return contentUrlMatch[1]
  } else if (thumbnailUrlMatch) {
    return thumbnailUrlMatch[1]
  }
}

const writeFile = (videoUrl, filePath, callback) => {
  var err, file, stats
  try {
    stats = fs.lstatSync(filePath)
    console.log("skipping: " + filePath)
    return callback()
  } catch (error1) {
    err = error1
    console.log("writing: " + filePath)
    file = fs.createWriteStream(filePath)
    return https.get(videoUrl, function(resp) {
      resp.pipe(file)
      return file.on('finish', function() {
        file.close()
        return callback()
      })
    })
  }
}

module.exports = downloadSeries
