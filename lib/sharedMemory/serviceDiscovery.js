'use strict'

const util = require('util')

const WORKERS_PROCESSING_SET_KEY = 'workers:processing:set'
const WORKERS_ALIVE_KEY_PREFIX = 'workers:alive:'
const WORKERS_PRODUCER_KEY = 'workers:producer'

const WORKER_ALIVE_TTL = 5
const WORKER_PRODUCER_TTL = 2

const ALIVE_STATUS = '1'

class ServiceDiscovery {
  constructor (redisClient) {
    this._asyncSAdd = util.promisify(redisClient.sadd).bind(redisClient)
    this._asyncSMembers = util.promisify(redisClient.smembers).bind(redisClient)
    this._asyncSRem = util.promisify(redisClient.srem).bind(redisClient)
    this._asyncSet = util.promisify(redisClient.set).bind(redisClient)
    this._asyncGet = util.promisify(redisClient.get).bind(redisClient)
    this._asyncExpire = util.promisify(redisClient.expire).bind(redisClient)
  }

  async registerWorker (workerName) {
    if (await this._asyncSAdd(WORKERS_PROCESSING_SET_KEY, workerName) !== 1) {
      throw new Error('Cannot register worker')
    }
  }

  async getRegisteredWorkers () {
    return this._asyncSMembers(WORKERS_PROCESSING_SET_KEY)
  }

  async deRegisterWorker (workerName) {
    if (await this._asyncSRem(WORKERS_PROCESSING_SET_KEY, workerName) !== 1) {
      throw new Error('Cannot deRegister worker')
    }
  }

  async updateAliveStatus (workerName) {
    if (await this._asyncSet(WORKERS_ALIVE_KEY_PREFIX + workerName, ALIVE_STATUS, 'EX', WORKER_ALIVE_TTL) === null) {
      throw new Error('Cannot update alive status')
    }
  }

  async workerIsAlive (workerName) {
    return await this._asyncGet(WORKERS_ALIVE_KEY_PREFIX + workerName) === ALIVE_STATUS
  }

  async setProducer (workerName) {
    return await this._asyncSet(WORKERS_PRODUCER_KEY, workerName, 'EX', WORKER_PRODUCER_TTL, 'NX') !== null
  }

  async getProducer () {
    return this._asyncGet(WORKERS_PRODUCER_KEY)
  }

  async updateProducerTTL () {
    if (await this._asyncExpire(WORKERS_PRODUCER_KEY, WORKER_PRODUCER_TTL) === null) {
      throw new Error('Cannot update producer ttl')
    }

    return this._asyncGet(WORKERS_PRODUCER_KEY)
  }
}

module.exports = ServiceDiscovery
