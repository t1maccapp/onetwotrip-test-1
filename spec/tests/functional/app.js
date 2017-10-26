'use strict'

const mocha = require('mocha')
const assert = require('chai').assert
const spawn = require('child_process').spawn

describe('smoke tests', () => {
  describe('worker', () => {
    it('should send to stdout smth and close with null exit code', (done) => {
      const workerProcess = spawn('node', ['app.js'])

      workerProcess.stdout.on('data', (data) => {
        assert.isTrue(data.length > 0)
      })

      workerProcess.on('close', (code) => {
        assert.equal(code, null)

        return done()
      })

      setTimeout(() => {
        workerProcess.kill('SIGINT')
      }, 750)
    })
  })

  describe('get errors', () => {
    it('should close with 0 exit code', (done) => {
      const workerProcess = spawn('node', ['app.js', '--getErrors'])

      workerProcess.on('close', (code) => {
        assert.equal(code, 0)

        return done()
      })

      setTimeout(() => {
        workerProcess.kill('SIGINT')
      }, 750)
    })
  })

  describe('requeue errors', () => {
    it('should close with 0 exit code', (done) => {
      const workerProcess = spawn('node', ['app.js', '--requeue'])

      workerProcess.on('close', (code) => {
        assert.equal(code, 0)

        return done()
      })

      setTimeout(() => {
        workerProcess.kill('SIGINT')
      }, 750)
    })
  })
})
