'use strict'

const mocha = require('mocha')
const assert = require('chai').assert
const sinon = require('sinon')
const rewire = require('rewire')

const Worker = rewire('../../../../lib/worker')

describe('worker.js', () => {
  describe('type', () => {
    it('should return this_.type', async () => {
      const worker = new Worker()

      worker._type = Worker.TYPE_PRODUCER
      assert.equal(worker.type, Worker.TYPE_PRODUCER)

      worker._type = Worker.TYPE_CONSUMER
      assert.equal(worker.type, Worker.TYPE_CONSUMER)
    })
  })

  describe('register', () => {
    it('should call this._serviceDiscovery.registerWorker', async () => {
      const registerWorker = sinon.spy()

      const worker = new Worker({registerWorker: registerWorker})

      await worker.register()

      assert.isTrue(registerWorker.calledOnce)
      assert.isTrue(registerWorker.calledWith(worker._name))
    })
  })

  describe('printErrors', () => {
    it('should call this._messageBroker.getErrorsChunk once', async () => {
      const worker = new Worker()

      let getErrorsChunk = sinon
        .stub()
        .resolves([])

      worker._messageBroker = {getErrorsChunk: getErrorsChunk}

      await worker.printErrors()

      assert.isTrue(getErrorsChunk.calledOnce)
    })

    it('should call this._messageBroker.getErrorsChunk twice', async () => {
      const worker = new Worker()

      let getErrorsChunk = sinon
        .stub()
        .onFirstCall()
        .resolves(['error', 'error'])
        .onSecondCall()
        .resolves([])

      worker._messageBroker = {getErrorsChunk: getErrorsChunk}

      await worker.printErrors()

      assert.isTrue(getErrorsChunk.calledTwice)
    })
  })

  describe('requeueProcessingMessages', () => {
    it('should call this._serviceDiscovery.getRegisteredWorkers and this._serviceDiscovery.workerIsAlive', async () => {
      const worker = new Worker()

      let workerName = 'name1'

      let getRegisteredWorkers = sinon
        .stub()
        .resolves([workerName])

      let workerIsAlive = sinon
        .stub()
        .withArgs(workerName)
        .resolves(true)

      worker._serviceDiscovery = {
        getRegisteredWorkers: getRegisteredWorkers,
        workerIsAlive: workerIsAlive
      }

      await worker.requeueProcessingMessages()

      assert.isTrue(getRegisteredWorkers.calledOnce)
      assert.isTrue(workerIsAlive.calledOnce)
    })

    it('should call this._serviceDiscovery.getRegisteredWorkers and this._serviceDiscovery.workerIsAlive,' + ' then this._messageBroker.requeueProcessingMessage and this._serviceDiscovery.deRegisterWorker', async () => {
      const worker = new Worker()

      let workerName = 'name1'

      let getRegisteredWorkers = sinon
        .stub()
        .resolves([workerName])

      let workerIsAlive = sinon
        .stub()
        .withArgs(workerName)
        .resolves(false)

      let requeueProcessingMessage = sinon
        .stub()
        .withArgs(workerName)
        .resolves()

      let deRegisterWorker = sinon
        .stub()
        .withArgs(workerName)
        .resolves()

      worker._serviceDiscovery = {
        getRegisteredWorkers: getRegisteredWorkers,
        workerIsAlive: workerIsAlive,
        deRegisterWorker: deRegisterWorker
      }

      worker._messageBroker = {
        requeueProcessingMessage: requeueProcessingMessage
      }

      await worker.requeueProcessingMessages()

      assert.isTrue(getRegisteredWorkers.calledOnce)
      assert.isTrue(workerIsAlive.calledOnce)
      assert.isTrue(requeueProcessingMessage.calledOnce)
      assert.isTrue(deRegisterWorker.calledOnce)
    })
  })

  describe('_updateWorkerStatus', () => {
    it('should call this._serviceDiscovery.updateAliveStatus', async () => {
      const updateAliveStatus = sinon.spy()

      const worker = new Worker({updateAliveStatus: updateAliveStatus})

      await worker._updateWorkerStatus()

      assert.isTrue(updateAliveStatus.calledOnce)
      assert.isTrue(updateAliveStatus.calledWith(worker._name))
    })
  })

  describe('_tryToBecomeProducer', () => {
    it('should call this._serviceDiscovery.setProducer and become producer', async () => {
      const worker = new Worker()

      let setProducer = sinon
        .stub()
        .resolves(true)

      worker._serviceDiscovery = {setProducer: setProducer}

      await worker._tryToBecomeProducer()

      assert.isTrue(setProducer.calledOnce)
      assert.isTrue(setProducer.calledWith(worker._name))
      assert.equal(worker.type, Worker.TYPE_PRODUCER)
    })
  })

  describe('_tryToUpdateProducerTTL', () => {
    it('should call this._serviceDiscovery.updateProducerTTL and become consumer, then return result', async () => {
      const worker = new Worker()

      let updateProducerTTL = sinon
        .stub()
        .resolves('nope')

      worker._serviceDiscovery = {updateProducerTTL: updateProducerTTL}

      await worker._tryToUpdateProducerTTL()

      assert.isTrue(updateProducerTTL.calledOnce)
      assert.equal(worker.type, Worker.TYPE_CONSUMER)
    })

    it('should call this._serviceDiscovery.updateProducerTTL and return result', async () => {
      const worker = new Worker()
      worker._type = Worker.TYPE_PRODUCER

      let updateProducerTTL = sinon
        .stub()
        .resolves(worker._name)

      worker._serviceDiscovery = {updateProducerTTL: updateProducerTTL}

      await worker._tryToUpdateProducerTTL()

      assert.isTrue(updateProducerTTL.calledOnce)
      assert.equal(worker.type, Worker.TYPE_PRODUCER)
    })
  })

  describe('_produce', () => {
    it('should call this._messageBroker.addNewMessage message', async () => {
      const worker = new Worker()

      let addNewMessage = sinon
        .stub()
        .resolves()

      worker._messageBroker = {addNewMessage: addNewMessage}

      await worker._produce()

      assert.isTrue(addNewMessage.calledOnce)
    })
  })

  describe('_consume', () => {
    it('should call this._messageBroker.getNextMessage with empty message', async () => {
      const worker = new Worker()

      let getNextMessage = sinon
        .stub()
        .resolves(null)

      worker._messageBroker = {getNextMessage: getNextMessage}

      await worker._consume()

      assert.isTrue(getNextMessage.calledOnce)
      assert.isTrue(getNextMessage.calledWith(worker._name))
    })

    it('should call this._messageBroker.getNextMessage with error message, then call this._messageBroker.nackLastMessage', async () => {
      const worker = new Worker()

      let getNextMessage = sinon
        .stub()
        .resolves('test')
      let nackLastMessage = sinon
        .stub()
        .resolves(null)
      let random = sinon.stub(Math, 'random').returns(-1)

      worker._messageBroker = {
        getNextMessage: getNextMessage,
        nackLastMessage: nackLastMessage
      }

      await worker._consume()

      random.restore()

      assert.isTrue(getNextMessage.calledOnce)
      assert.isTrue(getNextMessage.calledWith(worker._name))
      assert.isTrue(nackLastMessage.calledOnce)
      assert.isTrue(nackLastMessage.calledWith(worker._name))
    })

    it('should call this._messageBroker.getNextMessage with message, then call this._messageBroker.ackLastMessage', async () => {
      const worker = new Worker()

      let getNextMessage = sinon
        .stub()
        .resolves('test')
      let ackLastMessage = sinon
        .stub()
        .resolves(null)
      let random = sinon.stub(Math, 'random').returns(1)

      worker._messageBroker = {
        getNextMessage: getNextMessage,
        ackLastMessage: ackLastMessage
      }

      await worker._consume()

      random.restore()

      assert.isTrue(getNextMessage.calledOnce)
      assert.isTrue(getNextMessage.calledWith(worker._name))
      assert.isTrue(ackLastMessage.calledOnce)
      assert.isTrue(ackLastMessage.calledWith(worker._name))
    })
  })
})
