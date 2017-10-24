'use strict'

const redis = require('redis')

const config = require('./lib/config')
const ServiceDiscovery = require('./lib/sharedMemory/serviceDiscovery')
const MessageBroker = require('./lib/sharedMemory/messageBroker')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')
const requeueMode = (process.argv[2] === '--requeue')

const DISCOVERY_TIMEOUT = 1000
const PRODUCER_WORKING_TIMEOUT = 500
const CONSUMER_WORKING_TIMEOUT = 100

let redisClient
let serviceDiscovery
let messageBroker
let worker

function init () {
  redisClient = redis.createClient({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  })

  serviceDiscovery = new ServiceDiscovery(redisClient)
  messageBroker = new MessageBroker(redisClient)
  worker = new Worker(serviceDiscovery, messageBroker)
}

async function run () {
  try {
    if (errorsReadMode) {
      await worker.printErrors()

      redisClient.quit()
    } else if (requeueMode) {
      await worker.requeueProcessingMessages()

      redisClient.quit()
    } else {
      await worker.register()
      await loopServiceDiscovery()
      await loopProcessingMessages()
    }
  } catch (err) {
    console.log(err)
  }
}

async function loopServiceDiscovery () {
  await worker.updateStatus()

  if (worker.type === Worker.TYPE_CONSUMER) {
    await worker.tryToBecomeProducer()
  }

  setTimeout(loopServiceDiscovery, DISCOVERY_TIMEOUT)
}

async function loopProcessingMessages () {
  switch (worker.type) {
    case Worker.TYPE_PRODUCER:
      if (await worker.tryToUpdateProducerTTL()) {
        await worker.produce()
      }

      setTimeout(loopProcessingMessages, PRODUCER_WORKING_TIMEOUT)
      break
    case Worker.TYPE_CONSUMER:
      await worker.consume()

      setTimeout(loopProcessingMessages, CONSUMER_WORKING_TIMEOUT)
      break
  }
}

init()

Promise.resolve().then(run)
