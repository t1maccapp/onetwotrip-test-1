'use strict'

const redis = require('redis')

const config = require('./lib/config')
const ServiceDiscovery = require('./lib/sharedMemory/serviceDiscovery')
const MessageBroker = require('./lib/sharedMemory/messageBroker')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')
const requeueMode = (process.argv[2] === '--requeue')

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
      await worker.loopServiceDiscovery()
      await worker.loopProcessingMessages()
    }
  } catch (err) {
    console.error(err)
  }
}

init()

Promise.resolve().then(run)
