'use strict'

const redis = require('redis')

const config = require('./lib/config')
const Discovery = require('./lib/sharedMemory/dicovery')
const Queues = require('./lib/sharedMemory/queues')
const Worker = require('./lib/worker')

const errorsReadMode = (process.argv[2] === '--getErrors')
const requeueMode = (process.argv[2] === '--requeue')

let redisClient
let discovery
let queues
let worker

async function initWorker () {
  redisClient = redis.createClient({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  })

  discovery = new Discovery(redisClient)
  queues = new Queues(redisClient)
  worker = new Worker(discovery, queues)
}

async function runWorker () {
  if (errorsReadMode) {
    await worker.printErrors()
  } else if (requeueMode) {
    await worker.requeueProcessingMessages()
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
      console.log('P')

      if (await worker.tryToUpdateProducerTTL()) {
        console.log('UPDATED')
        await worker.produce()
      }

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
