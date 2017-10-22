'use strict'

const TYPE_CONSUMER = 0
const TYPE_PRODUCER = 1

class Worker {
  constructor (sharedMemory) {
    this._sharedMemory = sharedMemory
    this._type = TYPE_CONSUMER
    this._name = 'name' // TODO: generate name
  }

  async tryToBecomeProducer () {
    this._sharedMemory.setProducer()
  }

  async produce () {

  }

  async consume () {
    this._sharedMemory.getNextMessage()
    // check for errors
    // send error
    // ack message
  }

  async printErrors () {
    this._sharedMemory.getErrorsChunk()
    // print errors()
  }

  async recallProcessingMessages () {

  }
}

module.exports = Worker
