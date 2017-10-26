'use strict'

const uniqueId = require('uniqid')

const TYPE_CONSUMER = 0
const TYPE_PRODUCER = 1

const DISCOVERY_TIMEOUT = 1000
const PRODUCER_WORKING_TIMEOUT = 500
const CONSUMER_WORKING_TIMEOUT = 100

const ERRORS_PROBABILITY = 0.05

class Worker {
  constructor (serviceDiscovery, messageBroker) {
    this._serviceDiscovery = serviceDiscovery
    this._messageBroker = messageBroker
    this._type = TYPE_CONSUMER
    this._name = uniqueId()
  }

  async register () {
    await this._serviceDiscovery.registerWorker(this._name)
  }

  async loopServiceDiscovery () {
    await this._updateWorkerStatus()

    if (this._type === TYPE_CONSUMER) {
      await this._tryToBecomeProducer()
    }

    setTimeout(this.loopServiceDiscovery.bind(this), DISCOVERY_TIMEOUT)
  }

  async loopProcessingMessages () {
    switch (this._type) {
      case TYPE_PRODUCER:
        if (await this._tryToUpdateProducerTTL()) {
          await this._produce()
        }

        setTimeout(this.loopProcessingMessages.bind(this), PRODUCER_WORKING_TIMEOUT)
        break
      case TYPE_CONSUMER:
        await this._consume()

        setTimeout(this.loopProcessingMessages.bind(this), CONSUMER_WORKING_TIMEOUT)
        break
    }
  }

  async printErrors () {
    let errors

    do {
      errors = await this._messageBroker.getErrorsChunk()

      errors.map(err => console.log(err))
    } while (errors.length > 0)
  }

  async requeueProcessingMessages () {
    let registeredWorkers = await this._serviceDiscovery.getRegisteredWorkers()

    for (let workerName of registeredWorkers) {
      if (await this._serviceDiscovery.workerIsAlive(workerName)) {
        console.log('WORKER-' + workerName + ': still alive')

        continue
      }

      console.log('WORKER-' + workerName + ': processing message will be returned if exists')

      await this._messageBroker.requeueProcessingMessage(workerName)
      await this._serviceDiscovery.deRegisterWorker(workerName)
    }
  }

  async _updateWorkerStatus () {
    await this._serviceDiscovery.updateAliveStatus(this._name)
  }

  async _tryToBecomeProducer () {
    if (await this._serviceDiscovery.setProducer(this._name)) {
      this._type = TYPE_PRODUCER
    }
  }

  async _tryToUpdateProducerTTL () {
    let updated = await this._serviceDiscovery.updateProducerTTL(this._name) === this._name

    if (!updated) {
      this._type = TYPE_CONSUMER
    }

    return updated
  }

  async _produce () {
    let message = JSON.stringify({producer: this._name, time: Date.now()})

    await this._messageBroker.addNewMessage(message)

    console.log('PRODUCER-' + this._name + ': ' + message)
  }

  async _consume () {
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
}

module.exports = Worker
