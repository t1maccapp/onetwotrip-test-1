'use strict'

const uniqueId = require('uniqid')

const TYPE_CONSUMER = 0
const TYPE_PRODUCER = 1

const ERRORS_PROBABILITY = 0.05

class Worker {
  constructor (sharedMemory) {
    this._sharedMemory = sharedMemory
    this._type = TYPE_CONSUMER
    this._name = uniqueId()
  }

  static get TYPE_CONSUMER () {
    return TYPE_CONSUMER
  }

  static get TYPE_PRODUCER () {
    return TYPE_PRODUCER
  }

  get TYPE () {
    return this._type
  }

  async updateStatus () {
    await this._sharedMemory.updateAliveStatus(this._name)
  }

  async tryToBecomeProducer () {
    let becameProducer = await this._sharedMemory.setProducer(this._name)

    if (becameProducer) {
      this._type = TYPE_PRODUCER

      return
    }

    this._type = TYPE_CONSUMER
  }

  async produce () {
    await this._sharedMemory.addNewMessage(new Date() + uniqueId())
  }

  async consume () {
    let message = await this._sharedMemory.getNextMessage(this._name)

    console.log(JSON.stringify(message))

    if (Math.random() <= ERRORS_PROBABILITY) {
      console.log('error!')
      return this._sharedMemory.nackLastMessage(this._name)
    }

    return this._sharedMemory.ackLastMessage(this._name)
  }

  // TODO
  async printErrors () {
    let errors = await this._sharedMemory.getErrorsChunk()
    console.log(errors)
  }

  async requeueProcessingMessages () {
    let registeredWorkers = this._sharedMemory.getRegisteredWorkers()

    for (let workerName of registeredWorkers) {
      if (await this._sharedMemory.getWorkerStatus()) {
        continue
      }

      await this._sharedMemory.requeueProcessingMessage(workerName)
      await this._sharedMemory.deRegisterWorker(workerName)
    }
  }
}

module.exports = Worker
