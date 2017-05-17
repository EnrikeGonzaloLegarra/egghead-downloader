import program from 'commander'
import { signIn } from './sign_in'
import { downloadSeries } from './download'

program.parse(process.argv)

if (program.args.length === 0) {
  console.error('Pass an url to an egghead series')
  process.exit(1)
}

const seriesUrl = program.args[0]

const run = async () => {
  await signIn({
    email: process.env.EMAIL,
    password: process.env.PASSWORD
  })
  await downloadSeries(seriesUrl)
  console.log('\n✓ All Done')
}

run()
