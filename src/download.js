import https from 'https'
import cheerio from 'cheerio'
import request from 'request-promise-native'
import { cpus } from 'os'
import { eachLimit } from 'async'
import { basename } from 'path'
import { parse as parseUrl } from 'url'
import { sync as mkdirpSync } from 'mkdirp'
import { lstatSync, createWriteStream, writeFileSync } from 'fs'

const VIDEO_BASE_URL = 'https://embedwistia-a.akamaihd.net/deliveries/'
const defaultRequestOptions = {
  jar: true,
  rejectUnauthorized: false,
  followAllRedirects: true
}

export const downloadSeries = async (url) => {
  const linksInfo = await fetchLinks(url)
  const metadata = await downloadAllVideos(linksInfo)
  return saveMetadataInfo(metadata)
}

const fetchLinks = async (url) => {
  console.log(`Looking for links: ${url}`)
  const parts = url.split('/')
  const series = parts[parts.length - 1]

  const html = await request(url, defaultRequestOptions)

  const $ = cheerio.load(html)
  const links = []
  $('a.flex.bg-white').each(function (i, link) {
    const index = `${(i+1)<10?'0':''}${i+1}`
    const href =  $(this).attr('href')
    links.push({ href, series, index })
  })

  return { url, series, links }
}

const getVideoInfo = async ({ index, series, href }) => {
  console.log(`Opening page: ${href}`)
  const html = await request(href, defaultRequestOptions)

  if (html.indexOf('This lesson is for PRO members.') > -1) {
    throw Error('This lesson is for PRO members.')
  }
  const id = getVideoID(html)
  const videoUrl = `${VIDEO_BASE_URL}${id}/file.mp4`
  const fileName = `${basename(parseUrl(href).pathname)}.mp4`
  const filePath = `videos/${series}/${index}-${fileName}`

  mkdirpSync(`videos/${series}`)
  return { index, fileName, href, series, videoUrl, filePath }
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
    const stats = lstatSync(filePath)

    console.log('\tSkipping: ' + filePath)
    return callback()
  } catch (e) {

    console.log('\tWriting: ' + filePath)
    const file = createWriteStream(filePath)
    return https.get(videoUrl, (resp) => {
      resp.pipe(file)
      return file.on('finish', () => {
        file.close()
        return callback()
      })
    })
  }
}

const downloadAllVideos = ({ url, series, links }) => new Promise((resolve, reject) => {
  const threadCount = cpus().length
  const info = {
    url,
    series,
    videos: []
  }
  console.log(`Found ${links.length} videos. Downloading with ${threadCount} threads`)

  eachLimit(links, threadCount, (link, next) => {
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

const saveMetadataInfo = info => {
  const metaFile = `videos/${info.series}.json`
  const content = JSON.stringify(info, null, 2)
  console.log(`Saving metadata file: ${metaFile}`)
  writeFileSync(metaFile, content)
}
