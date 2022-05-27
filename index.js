require('module-alias/register')
const requireDir = require('require-dir')

async function start() {
  const platforms = requireDir('./platforms', {
    recurse: false,
    filter: (file) => !file.endsWith('base.js'),
    extensions: ['.js'],
    mapValue: (value) => new value(),
  })
  Object.entries(platforms).forEach(([, platformClass]) => {
    platformClass.createSchedules()
  })
}

start()
