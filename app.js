'use strict'

const redis = require('redis')

const config = require('./lib/config')
const Discovery = require('./lib/sharedMemory/discovery')
const Queues = require('./lib/sharedMemory/queues')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')
const requeueMode = (process.argv[2] === '--requeue')

const DISCOVERY_TIMEOUT = 2500
const PRODUCER_WORKING_TIMEOUT = 500
const CONSUMER_WORKING_TIMEOUT = 100

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
    await loopDiscovery()
    await loopWorking()
  }
}

async function loopDiscovery () {
  await worker.updateStatus()

  if (worker.type === Worker.TYPE_CONSUMER) {
    await worker.tryToBecomeProducer()
  }

  setTimeout(loopDiscovery, DISCOVERY_TIMEOUT)
}

async function loopWorking () {
  switch (worker.type) {
    case Worker.TYPE_PRODUCER:
      if (await worker.tryToUpdateProducerTTL()) {
        await worker.produce()
      }

      setTimeout(loopWorking, PRODUCER_WORKING_TIMEOUT)
      break
    case Worker.TYPE_CONSUMER:
      await worker.consume()
      setTimeout(loopWorking, CONSUMER_WORKING_TIMEOUT)
      break
  }
}

process.on('unhandledRejection', err => {
  throw err
})

Promise.resolve()
  .then(init)
  .then(run)
