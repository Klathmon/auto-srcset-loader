import { extname } from 'path'
import { parseQuery, emitFile } from 'loader-utils'
import Jimp from 'jimp'

export default async function loader (content) {
  this.cacheable && this.cacheable()
  const loaderCallback = this.async()
  const {
    percentages = [100, 75, 50, 25, 10],
    srcSize = Math.min(percentages),
    name: outputName = '[hash]-[percentage]',
    ext = extname(this.resourcePath),
    sizes = ['(min-width: 800px) 50vw', '100vw']
  } = parseQuery(this.query)

  // TODO: only handle supported image formats, currently PNG, JPEG, or BMP, fallback to file-loader if it's not used?

  // TODO: error handling
  const sourceImage = await Jimp.read(this.resourcePath)

  let src

  const srcsetArray = await Promise.all(percentages.map((percentage) => new Promise((resolve, reject) => {
      const scaleSize = percentage / 100
      const outputWidth = Math.round(sourceImage.bitmap.width * scaleSize)
      const filename = outputName.replace(/\[percentage\]/ig, percentage)
      sourceImage.clone().scale(scaleSize).getBuffer(Jimp.AUTO, (err, buffer) => {
        if (err) return reject(err)

        emitFile(filename, buffer)
        const srcsetObject = {
          filename,
          width: outputWidth
        }
        if (percentage === srcSize) {
          src = srcsetObject
        }
        resolve(srcsetObject)
      })
  })))

  // TODO: figure out the right way to return the output, cause i'm like 99% sure this isn't it...
  return {
    src: src.filename,
    toString: src.filename,
    srcset: srcsetArray.map(({ filename, width }) => `${filename}.${ext} ${width}w`).join(', '),
    sizes: sizes.join(', ')
  }
}
