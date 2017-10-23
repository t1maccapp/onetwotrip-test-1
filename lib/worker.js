'use strict'

const uniqueId = require('uniqid')

const TYPE_CONSUMER = 0
const TYPE_PRODUCER = 1
const ERRORS_PROBABILITY = 0.05

class Worker {
  constructor (serviceDiscovery, messageBroker) {
    this._serviceDiscovery = serviceDiscovery
    this._messageBroker = messageBroker
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
    await this._serviceDiscovery.registerWorker(this._name)
  }

  async updateStatus () {
    await this._serviceDiscovery.updateAliveStatus(this._name)
  }

  async tryToBecomeProducer () {
    if (await this._serviceDiscovery.setProducer(this._name)) {
      this._type = TYPE_PRODUCER

      return
    }

    this._type = TYPE_CONSUMER
  }

  async tryToUpdateProducerTTL () {
    let updated = await this._serviceDiscovery.updateProducerTTL(this._name) === this._name

    if (!updated) {
      this._type = TYPE_CONSUMER
    }

    return updated
  }

  async produce () {
    let message = JSON.stringify({producer: this._name, time: Date.now()})

    await this._messageBroker.addNewMessage(message)

    console.log('PRODUCER-' + this._name + ': ' + message)
  }

  async consume () {
    let message = await this._messageBroker.getNextMessage(this._name)

    if (!message) {
      return
    }

    if (Math.random() <= ERRORS_PROBABILITY) {
      console.log('CONSUMER-' + this._name + ': ' + message + ' with error!')

      return this._messageBroker.nackLastMessage(this._name)
    }

    console.log('CONSUMER-' + this._name + ': ' + message)

    return this._messageBroker.ackLastMessage(this._name)
  }

  async printErrors () {
    let errors = await this._messageBroker.getErrors()

    errors.map(err => console.log(err))
  }

  async requeueProcessingMessages () {
    let registeredWorkers = await this._serviceDiscovery.getRegisteredWorkers()

    for (let workerName of registeredWorkers) {
      if (await this._serviceDiscovery.getWorkerStatus(workerName)) {
        console.log('WORKER-' + workerName + ': still alive')

        continue
      }

      console.log('WORKER-' + workerName + ': processing message will be returned if exists')

      await this._messageBroker.requeueProcessingMessage(workerName)
      await this._serviceDiscovery.deRegisterWorker(workerName)
    }
  }
}

module.exports = Worker
