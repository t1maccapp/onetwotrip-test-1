'use strict'

const util = require('util')

const WORKERS_PROCESSING_SET_KEY = 'workers:processing:set'
const WORKERS_ALIVE_KEY_PREFIX = 'workers:alive:'
const WORKERS_PRODUCER_KEY = 'workers:producer'
const MESSAGES_QUEUE_KEY = 'messages_queue'
const MESSAGES_QUEUE_ERRORS_KEY = 'messages_queue_errors'
const WORKERS_PROCESSING_KEY_PREFIX = 'workers:processing:'

const WORKER_ALIVE_TTL = 5
const WORKER_PRODUCER_TTL = 5

class SharedMemory {
  constructor (redisClient) {
    this._asyncSadd = util.promisify(redisClient.sadd).bind(redisClient)
    this._asyncSMembers = util.promisify(redisClient.smembers).bind(redisClient)
    this._asyncSRem = util.promisify(redisClient.srem).bind(redisClient)
    this._asyncSet = util.promisify(redisClient.set).bind(redisClient)
    this._asyncGet = util.promisify(redisClient.get).bind(redisClient)
    this._asyncRPush = util.promisify(redisClient.rpush).bind(redisClient)
    this._asyncRPopLPush = util.promisify(redisClient.rpoplpush).bind(redisClient)
    this._asyncLRange = util.promisify(redisClient.lrange).bind(redisClient)
    this._asyncLRem = util.promisify(redisClient.lrem).bind(redisClient)
  }

  async registerWorker (workerName) {
    await this._asyncSadd(WORKERS_PROCESSING_SET_KEY, workerName)
  }

  async getRegisteredWorkers () {
    return this._asyncSMembers(WORKERS_PROCESSING_SET_KEY)
  }

  async deRegisterWorker (workerName) {
    await this._asyncSRem(WORKERS_PROCESSING_SET_KEY, workerName)
  }

  async updateAliveStatus (workerName) {
    await this._asyncSet(WORKERS_ALIVE_KEY_PREFIX + workerName, 1, 'EX', WORKER_ALIVE_TTL)
  }

  async getWorkerStatus (workerName) {
    return this._asyncGet(WORKERS_ALIVE_KEY_PREFIX + workerName)
  }

  async setProducer (workerName) {
    return this._asyncSet(WORKERS_PRODUCER_KEY, workerName, 'EX', WORKER_PRODUCER_TTL, 'NX')
  }

  async addNewMessage (message) {
    await this._asyncRPush(MESSAGES_QUEUE_KEY, message)
  }

  async getNextMessage (workerName) {
    let processingMessage = await this._asyncLRange(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)

    if (!processingMessage) {
      await this._asyncRPopLPush(MESSAGES_QUEUE_KEY, WORKERS_PROCESSING_KEY_PREFIX + workerName)

      processingMessage = await this._asyncLRange(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)
    }

    return processingMessage
  }

  async ackLastMessage (workerName) {
    await this._asyncLRem(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)
  }

  async nackLastMessage (workerName) {
    await this._asyncRPopLPush(WORKERS_PROCESSING_KEY_PREFIX + workerName, MESSAGES_QUEUE_ERRORS_KEY)
  }

  // TODO: implement chunks, remove from list
  async getErrorsChunk (size) {
    return this._asyncLRange(MESSAGES_QUEUE_ERRORS_KEY, 0, -1)
  }

  async requeueProcessingMessage (workerName) {
    await this._asyncRPopLPush(WORKERS_PROCESSING_KEY_PREFIX + workerName, MESSAGES_QUEUE_KEY)
  }
}

module.exports = SharedMemory
