'use strict'

const redis = require('redis')

const config = require('./lib/config')
const ServiceDiscovery = require('./lib/sharedMemory/serviceDiscovery')
const Queues = require('./lib/sharedMemory/queues')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')
const requeueMode = (process.argv[2] === '--requeue')

const DISCOVERY_TIMEOUT = 1000
const PRODUCER_WORKING_TIMEOUT = 500
const CONSUMER_WORKING_TIMEOUT = 100

let redisClient
let serviceDiscovery
let queues
let worker

function init () {
  redisClient = redis.createClient({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  })

  serviceDiscovery = new ServiceDiscovery(redisClient)
  queues = new Queues(redisClient)
  worker = new Worker(serviceDiscovery, queues)
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

// wtf https://github.com/nodejs/node/issues/9523
process.on('unhandledRejection', err => { console.err(err) })

init()

Promise.resolve().then(run)
