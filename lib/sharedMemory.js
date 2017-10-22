'use strict'

const util = require('util')

const WORKERS_PROCESSING_SET_KEY = 'workers:processing:set'
const WORKERS_ALIVE_KEY_PREFIX = 'workers:alive:'
const WORKERS_PRODUCER_KEY = 'workers:producer'
const MESSAGES_QUEUE_KEY = 'messages_queue'
const MESSAGES_QUEUE_ERRORS_KEY = 'messages_queue_errors'
const WORKERS_PROCESSING_KEY_PREFIX = 'workers:processing:'

const WORKER_ALIVE_TTL = 10
const WORKER_PRODUCER_TTL = 5

class SharedMemory {
  constructor (redisClient) {
    this._redisClient = redisClient
    this._asyncSadd = util.promisify(redisClient.sadd)
    this._asyncSet = util.promisify(redisClient.set)
    this._asyncRPush = util.promisify(redisClient.rpush)
    this._asyncRPopLPush = util.promisify(redisClient.rpoplpush)
    this._asyncLRange = util.promisify(redisClient.lrange)
    this._asyncLRem = util.promisify(redisClient.lrem)
  }

  async registerWorker (workerName) {
    await this._asyncSadd(WORKERS_PROCESSING_SET_KEY, workerName)
  }

  async updateAliveStatus (workerName) {
    await this._asyncSet(WORKERS_ALIVE_KEY_PREFIX + workerName, 1, 'EX', WORKER_ALIVE_TTL)
  }

  async setProducer (workerName) {
    return this._asyncSet(WORKERS_PRODUCER_KEY, workerName, 'EX', WORKER_PRODUCER_TTL)
  }

  async addNewMessage (message) {
    await this._asyncRPush(MESSAGES_QUEUE_KEY, message)
  }

  async getNextMessage (workerName) {
    let processingMessage = await this._asyncLRange(this._getWorkerProcessingListName(workerName), 0, 1)

    if (!processingMessage) {
      await this._asyncRPopLPush(MESSAGES_QUEUE_KEY, this._getWorkerProcessingListName(workerName))

      processingMessage = await this._asyncLRange(this._getWorkerProcessingListName(workerName), 0, 1)
    }

    return processingMessage
  }

  async ackLastMessage (workerName) {
    let workerProcessingListName = this._getWorkerProcessingListName(workerName)

    await this._asyncLRem(workerProcessingListName, 0, 1)
  }

  async nackLastMessage (workerName) {
    let workerProcessingListName = this._getWorkerProcessingListName(workerName)

    await this._asyncRPopLPush(workerProcessingListName, MESSAGES_QUEUE_ERRORS_KEY)
  }

  // TODO: implement chunks
  async getErrorsChunk (size) {
    return this._asyncLRange(MESSAGES_QUEUE_ERRORS_KEY, 0, -1)
  }

  async requeueProcessingMessage (workerName) {
    let workerProcessingListName = this._getWorkerProcessingListName(workerName)

    await this._asyncRPopLPush(workerProcessingListName, MESSAGES_QUEUE_KEY)
  }

  _getWorkerProcessingListName (workerName) {
    return WORKERS_PROCESSING_KEY_PREFIX + workerName
  }
}

module.exports = SharedMemory
