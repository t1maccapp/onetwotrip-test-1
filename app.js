'use strict'

const redis = require('redis')

const config = require('./lib/config')
const Discovery = require('./lib/sharedMemory/discovery')
const Queues = require('./lib/sharedMemory/queues')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')
const requeueMode = (process.argv[2] === '--requeue')

let redisClient
let discovery
let queues
let worker

async function init () {
  redisClient = redis.createClient({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  })

  discovery = new Discovery(redisClient)
  queues = new Queues(redisClient)
  worker = new Worker(discovery, queues)
}

async function run () {
  if (errorsReadMode) {
    await worker.printErrors()

    redisClient.quit()
  } else if (requeueMode) {
    await worker.requeueProcessingMessages()

    redisClient.quit()
  } else {
    await worker.register()
    await loop1()
    await loop2()
  }
}

async function loop1 () {
  await worker.updateStatus()

  if (worker.type === Worker.TYPE_CONSUMER) {
    await worker.tryToBecomeProducer()
  }

  setTimeout(loop1, 2500)
}

async function loop2 () {
  switch (worker.type) {
    case Worker.TYPE_PRODUCER:
      if (await worker.tryToUpdateProducerTTL()) {
        await worker.produce()
      }

      setTimeout(loop2, 500)
      break
    case Worker.TYPE_CONSUMER:
      await worker.consume()
      setTimeout(loop2, 100)
      break
  }
}

process.on('unhandledRejection', err => {
  throw err
})

Promise.resolve()
  .then(init)
  .then(run)
