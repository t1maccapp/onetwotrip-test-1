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
    await loop1()
    await loop2()
  }
}

async function loop1 () {
  await worker.updateStatus()
  await worker.tryToBecomeProducer()
  console.log(1)
  setTimeout(loop1, 2500)
}

async function loop2 () {
  switch (worker.TYPE) {
    case Worker.TYPE_PRODUCER:
      console.log('P')
      await worker.produce()
      setTimeout(loop2, 500)
      break
    case Worker.TYPE_CONSUMER:
      console.log('C')
      await worker.consume()
      setTimeout(loop2, 100)
      break
  }
}

Promise.resolve()
  .then(initWorker)
  .then(runWorker)
