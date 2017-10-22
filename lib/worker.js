'use strict'

const uniqueId = require('uniqid')

const TYPE_CONSUMER = 0
const TYPE_PRODUCER = 1
const ERRORS_PROBABILITY = 0.05

class Worker {
  constructor (discovery, queues) {
    this._discovery = discovery
    this._queues = queues
    this._type = TYPE_CONSUMER
    this._name = uniqueId()
  }

  static get TYPE_CONSUMER () {
    return TYPE_CONSUMER
  }

  static get TYPE_PRODUCER () {
    return TYPE_PRODUCER
  }

  get type () {
    return this._type
  }

  async register () {
    await this._discovery.registerWorker(this._name)
  }

  async updateStatus () {
    await this._discovery.updateAliveStatus(this._name)
  }

  async tryToBecomeProducer () {
    if (await this._discovery.setProducer(this._name)) {
      this._type = TYPE_PRODUCER

      return
    }

    this._type = TYPE_CONSUMER
  }

  async tryToUpdateProducerTTL () {
    let updated = await this._discovery.updateProducerTTL(this._name) === this._name

    if (!updated) {
      this._type = TYPE_CONSUMER
    }

    return updated
  }

  async produce () {
    let message = JSON.stringify({worker: this._name, time: Date.now()})

    await this._queues.addNewMessage(message)

    console.log('PRODUCER-' + this._name + ': ' + message)
  }

  async consume () {
    let message = await this._queues.getNextMessage(this._name)

    if (!message) {
      return
    }

    if (Math.random() <= ERRORS_PROBABILITY) {
      console.log('CONSUMER-' + this._name + ': ' + message + ' with error!')
      return this._queues.nackLastMessage(this._name)
    }

    console.log('CONSUMER-' + this._name + ': ' + message)

    return this._queues.ackLastMessage(this._name)
  }

  // TODO
  async printErrors () {
    let errors = await this._queues.getErrors()
    console.log(errors)
  }

  async requeueProcessingMessages () {
    let registeredWorkers = await this._discovery.getRegisteredWorkers()
    for (let workerName of registeredWorkers) {
      if (await this._discovery.getWorkerStatus(workerName)) {
        console.log('WORKER-' + workerName + ' is still alive')
        continue
      }

      console.log('Workers ' + workerName + ' processing message will be returned if exists')
      await this._queues.requeueProcessingMessage(workerName)
      await this._discovery.deRegisterWorker(workerName)
    }
  }
}

module.exports = Worker
