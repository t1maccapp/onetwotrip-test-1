'use strict'

const redis = require('redis')

const config = require('./lib/config')
const SharedMemory = require('./lib/sharedMemory')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')

let redisClient
let sharedMemory
let worker

async function initWorker () {
  redisClient = redis.createClient({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  })

  sharedMemory = new SharedMemory(redisClient)
  worker = new Worker(sharedMemory)
}

async function runWorker () {
  if (errorsReadMode) {
    await worker.printErrors()
  } else {
    await worker.consume

  }
}

Promise.resolve()
  .then(initWorker)
  .then(runWorker)
