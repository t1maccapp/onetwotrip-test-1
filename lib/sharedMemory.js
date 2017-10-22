'use strict'

class SharedMemory {
  constructor (redisClient) {
    this._redisClient = redisClient
  }

  registerWorker (workerName) {

  }

  setProducer (workerName) {

  }

  getNextMessage (workerName) {

  }

  ackLastMessage (workerName) {

  }

  nackLastMessage (workerName) {

  }

  getErrorsChunk (size) {

  }

  recallProcessingMessage (workerName) {

  }
}

module.exports = SharedMemory
