'use strict'

const mocha = require('mocha')
const assert = require('chai').assert
const sinon = require('sinon')
const rewire = require('rewire')

const ServiceDiscovery = rewire('../../../../../lib/sharedMemory/serviceDiscovery')

const redisClientMock = {
  sadd: () => {},
  smembers: () => {},
  srem: () => {},
  set: () => {},
  get: () => {},
  expire: () => {}
}

describe('serviceDiscovery.js', () => {
  describe('registerWorker', () => {
    it('should call this._asyncSAdd and throw error', async () => {
      const workerName = 'workerName'
      const WORKERS_PROCESSING_SET_KEY = ServiceDiscovery.__get__('WORKERS_PROCESSING_SET_KEY')

      const asyncSAdd = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_SET_KEY, workerName)
        .returns(null)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSAdd = asyncSAdd

      try {
        await serviceDiscovery.registerWorker(workerName)

        assert.isTrue(false)
      } catch (err) {
        assert.typeOf(err, 'Error')
        assert.isTrue(asyncSAdd.calledOnce)
      }
    })

    it('should call this._asyncSAdd', async () => {
      const workerName = 'workerName'
      const WORKERS_PROCESSING_SET_KEY = ServiceDiscovery.__get__('WORKERS_PROCESSING_SET_KEY')

      const asyncSAdd = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_SET_KEY, workerName)
        .returns(1)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSAdd = asyncSAdd

      await serviceDiscovery.registerWorker(workerName)

      assert.isTrue(asyncSAdd.calledOnce)
    })
  })

  describe('getRegisteredWorkers', () => {
    it('should call this._asyncSMembers', async () => {
      const workersSet = [1, 2, 3]
      const WORKERS_PROCESSING_SET_KEY = ServiceDiscovery.__get__('WORKERS_PROCESSING_SET_KEY')

      const asyncSMembers = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_SET_KEY)
        .returns(workersSet)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSMembers = asyncSMembers

      assert.equal(await serviceDiscovery.getRegisteredWorkers(), workersSet)
      assert.isTrue(asyncSMembers.calledOnce)
    })
  })

  describe('deRegisterWorker', () => {
    it('should call this._asyncSRem and throw error', async () => {
      const workerName = 'workerName'
      const WORKERS_PROCESSING_SET_KEY = ServiceDiscovery.__get__('WORKERS_PROCESSING_SET_KEY')

      const asyncSRem = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_SET_KEY, workerName)
        .returns(null)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSRem = asyncSRem

      try {
        await serviceDiscovery.deRegisterWorker(workerName)

        assert.isTrue(false)
      } catch (err) {
        assert.typeOf(err, 'Error')
        assert.isTrue(asyncSRem.calledOnce)
      }
    })

    it('should call this._asyncSRem', async () => {
      const workerName = 'workerName'
      const WORKERS_PROCESSING_SET_KEY = ServiceDiscovery.__get__('WORKERS_PROCESSING_SET_KEY')

      const asyncSRem = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_SET_KEY, workerName)
        .returns(1)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSRem = asyncSRem

      await serviceDiscovery.deRegisterWorker(workerName)

      assert.isTrue(asyncSRem.calledOnce)
    })
  })

  describe('updateAliveStatus', () => {
    it('should call this._asyncSet and throw error', async () => {
      const workerName = 'workerName'
      const WORKERS_ALIVE_KEY_PREFIX = ServiceDiscovery.__get__('WORKERS_ALIVE_KEY_PREFIX')
      const ALIVE_STATUS = ServiceDiscovery.__get__('ALIVE_STATUS')
      const WORKER_ALIVE_TTL = ServiceDiscovery.__get__('WORKER_ALIVE_TTL')

      const asyncSet = sinon
        .stub()
        .withArgs(WORKERS_ALIVE_KEY_PREFIX + workerName, ALIVE_STATUS, 'EX', WORKER_ALIVE_TTL)
        .returns(null)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSet = asyncSet

      try {
        await serviceDiscovery.updateAliveStatus(workerName)

        assert.isTrue(false)
      } catch (err) {
        assert.typeOf(err, 'Error')
        assert.isTrue(asyncSet.calledOnce)
      }
    })

    it('should call this._asyncSet', async () => {
      const workerName = 'workerName'
      const WORKERS_ALIVE_KEY_PREFIX = ServiceDiscovery.__get__('WORKERS_ALIVE_KEY_PREFIX')
      const ALIVE_STATUS = ServiceDiscovery.__get__('ALIVE_STATUS')
      const WORKER_ALIVE_TTL = ServiceDiscovery.__get__('WORKER_ALIVE_TTL')

      const asyncSet = sinon
        .stub()
        .withArgs(WORKERS_ALIVE_KEY_PREFIX + workerName, ALIVE_STATUS, 'EX', WORKER_ALIVE_TTL)
        .returns('OK')

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSet = asyncSet

      await serviceDiscovery.updateAliveStatus(workerName)

      assert.isTrue(asyncSet.calledOnce)
    })
  })

  describe('workerIsAlive', () => {
    it('should call this._asyncGet', async () => {
      const workerName = 'workerName'
      const WORKERS_ALIVE_KEY_PREFIX = ServiceDiscovery.__get__('WORKERS_ALIVE_KEY_PREFIX')
      const ALIVE_STATUS = ServiceDiscovery.__get__('ALIVE_STATUS')

      const asyncGet = sinon
        .stub()
        .withArgs(WORKERS_ALIVE_KEY_PREFIX + workerName)
        .returns(ALIVE_STATUS)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncGet = asyncGet

      assert.isTrue(await serviceDiscovery.workerIsAlive(workerName))
      assert.isTrue(asyncGet.calledOnce)
    })
  })

  describe('setProducer', () => {
    it('should call this._asyncSet', async () => {
      const workerName = 'workerName'
      const WORKERS_PRODUCER_KEY = ServiceDiscovery.__get__('WORKERS_PRODUCER_KEY')
      const WORKER_PRODUCER_TTL = ServiceDiscovery.__get__('WORKER_PRODUCER_TTL')

      const asyncSet = sinon
        .stub()
        .withArgs(WORKERS_PRODUCER_KEY, workerName, 'EX', WORKER_PRODUCER_TTL, 'NX')
        .returns('OK')

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncSet = asyncSet

      assert.isTrue(await serviceDiscovery.setProducer(workerName))
      assert.isTrue(asyncSet.calledOnce)
    })
  })

  describe('getProducer', () => {
    it('should call this._asyncGet', async () => {
      const workerName = 'workerName'
      const WORKERS_PRODUCER_KEY = ServiceDiscovery.__get__('WORKERS_PRODUCER_KEY')

      const asyncGet = sinon
        .stub()
        .withArgs(WORKERS_PRODUCER_KEY)
        .returns(workerName)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncGet = asyncGet

      assert.equal(await serviceDiscovery.getProducer(), workerName)
      assert.isTrue(asyncGet.calledOnce)
    })
  })

  describe('updateProducerTTL', () => {
    it('should call this._asyncExpire and throw error', async () => {
      const WORKERS_PRODUCER_KEY = ServiceDiscovery.__get__('WORKERS_PRODUCER_KEY')
      const WORKER_PRODUCER_TTL = ServiceDiscovery.__get__('WORKER_PRODUCER_TTL')

      const asyncExpire = sinon
        .stub()
        .withArgs(WORKERS_PRODUCER_KEY, WORKER_PRODUCER_TTL)
        .returns(null)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncExpire = asyncExpire

      try {
        await serviceDiscovery.updateProducerTTL()

        assert.isTrue(false)
      } catch (err) {
        assert.typeOf(err, 'Error')
        assert.isTrue(asyncExpire.calledOnce)
      }
    })

    it('should call this._asyncExpire and this._asyncGet, then return workerName', async () => {
      const workerName = 'workerName'
      const WORKERS_PRODUCER_KEY = ServiceDiscovery.__get__('WORKERS_PRODUCER_KEY')
      const WORKERS_PROCESSING_SET_KEY = ServiceDiscovery.__get__('WORKERS_PROCESSING_SET_KEY')

      const asyncExpire = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_SET_KEY, workerName)
        .returns('OK')

      const asyncGet = sinon
        .stub()
        .withArgs(WORKERS_PRODUCER_KEY)
        .returns(workerName)

      const serviceDiscovery = new ServiceDiscovery(redisClientMock)
      serviceDiscovery._asyncExpire = asyncExpire
      serviceDiscovery._asyncGet = asyncGet

      assert.equal(await serviceDiscovery.updateProducerTTL(), workerName)
      assert.isTrue(asyncExpire.calledOnce)
      assert.isTrue(asyncGet.calledOnce)
    })
  })
})
