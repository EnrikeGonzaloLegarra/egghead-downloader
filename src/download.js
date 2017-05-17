'use strict'

const https = require('https')
const fs = require('fs')
const url = require('url')
const path = require('path')
const mkdirp = require('mkdirp')
const async = require('async')
const cheerio = require('cheerio')
const os = require('os')
const request = require('request-promise-native')

const VIDEO_BASE_URL = 'https://embedwistia-a.akamaihd.net/deliveries/'

const fetchLinks = url => {
  console.log(`Looking for links: ${url}`)
  const parts = url.split('/')
  const series = parts[parts.length - 1]
  return request(url,{
    jar: true,
    rejectUnauthorized: false,
    followAllRedirects: true
  })
  .then(html => {
    const $ = cheerio.load(html)
    const links = []
    $('a.flex.bg-white').each(function (i, link) {
      const index = `${(i+1)<10?'0':''}${i+1}`
      const href =  $(this).attr('href')
      links.push({ href, series, index })
    })
    return { series, links }
  })
  .catch(e => {
    console.error('Error during fetch', e)
    throw e
  })
}

const getVideoInfo = ({ index, series, href }) => {
  console.log(`Opening page: ${href}`)
  return request(href, {
    jar: true,
    rejectUnauthorized: false,
    followAllRedirects: true
  })
    .then(html => {
      if (html.indexOf('This lesson is for PRO members.') > -1) {
        throw Error('This lesson is for PRO members.')
      }
      const id = getVideoID(html)
      const videoUrl = `${VIDEO_BASE_URL}${id}/file.mp4`
      const fileName = `${path.basename(url.parse(href).pathname)}.mp4`
      const filePath = `videos/${series}/${index}-${fileName}`

      mkdirp.sync(`videos/${series}`)
      return { index, fileName, href, series, videoUrl, filePath }
    })
    .catch(e => {
      console.error('Error during getVidePath', e)
      throw e
    })
}

const getVideoID = (html) => {
  const $ = cheerio.load(html)
  const contentUrl = $('meta[itemprop=contentURL]').attr('content')
  const thumbnailUrl = $('meta[itemprop=thumbnailUrl]').attr('content')
  const regex = /deliveries\/(.*)+\.bin/
  const contentUrlMatch = contentUrl.match(regex)
  const thumbnailUrlMatch = thumbnailUrl.match(regex)
  if (contentUrlMatch) {
    return contentUrlMatch[1]
  } else if (thumbnailUrlMatch) {
    return thumbnailUrlMatch[1]
  }
}

const writeFile = ({ videoUrl, filePath }, callback) => {
  try {
    const stats = fs.lstatSync(filePath)

    console.log('\tSkipping: ' + filePath)
    return callback()
  } catch (e) {

    console.log('\tWriting: ' + filePath)
    const file = fs.createWriteStream(filePath)
    return https.get(videoUrl, (resp) => {
      resp.pipe(file)
      return file.on('finish', () => {
        file.close()
        return callback()
      })
    })
  }
}

const downloadAllVideos = ({ series, links }) => new Promise((resolve, reject) => {
  const threadCount = os.cpus().length
  const info = {
    series,
    videos: []
  }
  console.log(`Found ${links.length} videos. Downloading with ${threadCount} threads`)

  async.eachLimit(links, threadCount, (link, next) => {
    getVideoInfo(link)
      .then(video => {
        info.videos.push(video)
        writeFile(video, next)
      })
  }, (err) => {
    if (err) return reject(err)

    return resolve(info)
  })
})

const saveInfo = info => {
  const metaFile = `videos/${info.series}.json`
  const content = JSON.stringify(info, null, 2)
  console.log(`Saving metadata file: ${metaFile}`)
  fs.writeFileSync(metaFile, content)
}

module.exports = url => fetchLinks(url)
  .then(downloadAllVideos)
  .then(saveInfo)

