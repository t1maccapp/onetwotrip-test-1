'use strict'

const util = require('util')

const MESSAGES_QUEUE_KEY = 'messages_queue'
const MESSAGES_QUEUE_ERRORS_KEY = 'messages_queue_errors'
const WORKERS_PROCESSING_KEY_PREFIX = 'workers:processing:'

class Queues {
  constructor (redisClient) {
    this._asyncRPush = util.promisify(redisClient.rpush).bind(redisClient)
    this._asyncRPopLPush = util.promisify(redisClient.rpoplpush).bind(redisClient)
    this._asyncLRange = util.promisify(redisClient.lrange).bind(redisClient)
    this._asyncRPop = util.promisify(redisClient.rpop).bind(redisClient)
    this._asyncLLen = util.promisify(redisClient.llen).bind(redisClient)
    this._asyncLTrim = util.promisify(redisClient.ltrim).bind(redisClient)
  }

  async addNewMessage (message) {
    await this._asyncRPush(MESSAGES_QUEUE_KEY, message)
  }

  async getNextMessage (workerName) {
    let processingMessageArr = await this._asyncLRange(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)

    if (processingMessageArr.length === 0) {
      await this._asyncRPopLPush(MESSAGES_QUEUE_KEY, WORKERS_PROCESSING_KEY_PREFIX + workerName)

      processingMessageArr = await this._asyncLRange(WORKERS_PROCESSING_KEY_PREFIX + workerName, 0, 1)
    }

    return processingMessageArr[0]
  }

  async ackLastMessage (workerName) {
    await this._asyncRPop(WORKERS_PROCESSING_KEY_PREFIX + workerName)
  }

  async nackLastMessage (workerName) {
    await this._asyncRPopLPush(WORKERS_PROCESSING_KEY_PREFIX + workerName, MESSAGES_QUEUE_ERRORS_KEY)
  }

  async getErrors () {
    let length = await this._asyncLLen(MESSAGES_QUEUE_ERRORS_KEY)

    let errors = await this._asyncLRange(MESSAGES_QUEUE_ERRORS_KEY, 0, length - 1)

    await this._asyncLTrim(MESSAGES_QUEUE_ERRORS_KEY, length, -1)

    return errors
  }

  async requeueProcessingMessage (workerName) {
    await this._asyncRPopLPush(WORKERS_PROCESSING_KEY_PREFIX + workerName, MESSAGES_QUEUE_KEY)
  }
}

module.exports = Queues
