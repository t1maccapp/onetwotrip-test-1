'use strict'

const util = require('util')

const WORKERS_PROCESSING_SET_KEY = 'workers:processing:set'
const WORKERS_ALIVE_KEY_PREFIX = 'workers:alive:'
const WORKERS_PRODUCER_KEY = 'workers:producer'

const WORKER_ALIVE_TTL = 5
const WORKER_PRODUCER_TTL = 2

class ServiceDiscovery {
  constructor (redisClient) {
    this._asyncSadd = util.promisify(redisClient.sadd).bind(redisClient)
    this._asyncSMembers = util.promisify(redisClient.smembers).bind(redisClient)
    this._asyncSRem = util.promisify(redisClient.srem).bind(redisClient)
    this._asyncSet = util.promisify(redisClient.set).bind(redisClient)
    this._asyncGet = util.promisify(redisClient.get).bind(redisClient)
    this._asyncExpire = util.promisify(redisClient.expire).bind(redisClient)
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

  async getProducer () {
    return this._asyncGet(WORKERS_PRODUCER_KEY)
  }

  async updateProducerTTL () {
    await this._asyncExpire(WORKERS_PRODUCER_KEY, WORKER_PRODUCER_TTL)

    return this._asyncGet(WORKERS_PRODUCER_KEY)
  }
}

module.exports = ServiceDiscovery
