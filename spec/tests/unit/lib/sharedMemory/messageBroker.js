'use strict'

const mocha = require('mocha')
const assert = require('chai').assert
const sinon = require('sinon')
const rewire = require('rewire')

const MessageBroker = rewire('../../../../../lib/sharedMemory/messageBroker')

const redisClientMock = {
  rpush: () => {},
  rpoplpush: () => {},
  lrange: () => {},
  rpop: () => {},
  llen: () => {},
  ltrim: () => {}
}

describe('messageBroker.js', () => {
  describe('addNewMessage', () => {
    it('should call this._asyncRPush', async () => {
      const message = 'message'
      const MESSAGES_QUEUE_KEY = MessageBroker.__get__('MESSAGES_QUEUE_KEY')

      const asyncRPush = sinon.spy()

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncRPush = asyncRPush

      await messageBroker.addNewMessage(message)

      assert.isTrue(asyncRPush.calledOnce)
      assert.isTrue(asyncRPush.calledWith(MESSAGES_QUEUE_KEY, message))
    })
  })

  describe('getNextMessage', () => {
    it('should call this._asyncLRange and return message', async () => {
      const message = 'message'
      const workerName = 'worker'
      const WORKERS_PROCESSING_KEY_PREFIX = MessageBroker.__get__('WORKERS_PROCESSING_KEY_PREFIX')

      const asyncLRange = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)
        .returns([message])

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncLRange = asyncLRange

      assert.equal(await messageBroker.getNextMessage(workerName), message)
      assert.isTrue(asyncLRange.calledOnce)
    })

    it('should call this._asyncLRange which returns empty array, then call _asyncRPopLPush and return message', async () => {
      const message = 'message'
      const workerName = 'worker'
      const WORKERS_PROCESSING_KEY_PREFIX = MessageBroker.__get__('WORKERS_PROCESSING_KEY_PREFIX')
      const MESSAGES_QUEUE_KEY = MessageBroker.__get__('MESSAGES_QUEUE_KEY')

      const asyncLRange = sinon
        .stub()
        .withArgs(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)
        .returns([])

      const asyncRPopLPush = sinon
        .stub()
        .withArgs(MESSAGES_QUEUE_KEY, WORKERS_PROCESSING_KEY_PREFIX + workerName)
        .returns(message)

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncLRange = asyncLRange
      messageBroker._asyncRPopLPush = asyncRPopLPush

      assert.equal(await messageBroker.getNextMessage(workerName), message)
      assert.isTrue(asyncLRange.calledOnce)
      assert.isTrue(asyncRPopLPush.calledOnce)
    })
  })

  describe('ackLastMessage', () => {
    it('should call this._asyncRPop', async () => {
      const workerName = 'worker'
      const WORKERS_PROCESSING_KEY_PREFIX = MessageBroker.__get__('WORKERS_PROCESSING_KEY_PREFIX')

      const asyncRPop = sinon.spy()

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncRPop = asyncRPop

      await messageBroker.ackLastMessage(workerName)

      assert.isTrue(asyncRPop.calledOnce)
      assert.isTrue(asyncRPop.calledWith(WORKERS_PROCESSING_KEY_PREFIX + workerName))
    })
  })

  describe('nackLastMessage', () => {
    it('should call this._asyncRPopLPush', async () => {
      const workerName = 'worker'
      const WORKERS_PROCESSING_KEY_PREFIX = MessageBroker.__get__('WORKERS_PROCESSING_KEY_PREFIX')
      const MESSAGES_QUEUE_ERRORS_KEY = MessageBroker.__get__('MESSAGES_QUEUE_ERRORS_KEY')

      const asyncRPopLPush = sinon.spy()

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncRPopLPush = asyncRPopLPush

      await messageBroker.nackLastMessage(workerName)

      assert.isTrue(asyncRPopLPush.calledOnce)
      assert.isTrue(asyncRPopLPush.calledWith(WORKERS_PROCESSING_KEY_PREFIX + workerName, MESSAGES_QUEUE_ERRORS_KEY))
    })
  })

  describe('getErrorsChunk', () => {
    it('should call this._asyncLRange and this._asyncLTrim and then return errors', async () => {
      const MESSAGES_QUEUE_ERRORS_KEY = MessageBroker.__get__('MESSAGES_QUEUE_ERRORS_KEY')
      const ERRORS_CHUNK_SIZE = MessageBroker.__get__('ERRORS_CHUNK_SIZE')
      const errors = [1, 2, 3]

      const asyncLRange = sinon
        .stub()
        .withArgs(MESSAGES_QUEUE_ERRORS_KEY, -ERRORS_CHUNK_SIZE, -1)
        .returns(errors)

      const asyncLTrim = sinon.spy()

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncLRange = asyncLRange
      messageBroker._asyncLTrim = asyncLTrim

      assert.equal(await messageBroker.getErrorsChunk(), errors)
      assert.isTrue(asyncLRange.calledOnce)
      assert.isTrue(asyncLTrim.calledOnce)
      assert.isTrue(asyncLTrim.calledWith(MESSAGES_QUEUE_ERRORS_KEY, 0, -(ERRORS_CHUNK_SIZE + 1)))
    })
  })

  describe('requeueProcessingMessage', () => {
    it('should call this._asyncRPopLPush', async () => {
      const workerName = 'worker'
      const WORKERS_PROCESSING_KEY_PREFIX = MessageBroker.__get__('WORKERS_PROCESSING_KEY_PREFIX')
      const MESSAGES_QUEUE_KEY = MessageBroker.__get__('MESSAGES_QUEUE_KEY')

      const asyncRPopLPush = sinon.spy()

      const messageBroker = new MessageBroker(redisClientMock)
      messageBroker._asyncRPopLPush = asyncRPopLPush

      await messageBroker.requeueProcessingMessage(workerName)

      assert.isTrue(asyncRPopLPush.calledOnce)
      assert.isTrue(asyncRPopLPush.calledWith(WORKERS_PROCESSING_KEY_PREFIX + workerName, MESSAGES_QUEUE_KEY))
    })
  })
})
