'use strict'

/* eslint-env node, es6 */

const {describe, it} = require('mocha')
const {expect} = require('chai')
const {newInventoryDB} = require('../src')
const {checkEntry} = require('./fixtures')
const t = require('./testcases')
const _ = require('../src/util')

let inventoryDB

const opts = {
  'name': 'test',
  'url': 'mongodb://localhost:27017',
  'numEntries': 10
}

describe('inventory-db', () => {
  it('creates inventory db', (done) => {
    inventoryDB = newInventoryDB(opts)
    inventoryDB.once('started', done)
  })

  t.inventoryDBFails.forEach(({opts, error}) => {
    it('fails to create inventory db', (done) => {
      try {
        newInventoryDB(opts)
      } catch (err) {
        expect(err).to.be.an('error')
        expect(err.message).to.equal(error.message)
        done()
      }
    })
  })

  t.cases.forEach(({entries, start, end, available}) => {
    entries.slice(start, end).forEach((entry) => {
      it('does single update', (done) => {
        inventoryDB.once('updated', done)
        inventoryDB.emit('update', entry)
      })

      it('checks entry', (done) => {
        inventoryDB.once('gotEntry', (result) => {
          checkEntry(result, entry)
          done()
        })
        inventoryDB.emit('getEntry', entry.index)
      })
    })

    it('does multiple updates', (done) => {
      inventoryDB.once('updated', done)
      inventoryDB.emit('updates', entries)
    })

    it('checks multiple entries', (done) => {
      inventoryDB.once('gotEntries', (results) => {
        _.zipWith(results, entries.slice(start, end), checkEntry)
        done()
      })
      inventoryDB.emit('getEntries', start, end)
    })

    it('gets available inventory', (done) => {
      inventoryDB.once('gotAvailable', (result) => {
        expect(result).to.deep.equal(available)
        done()
      })
      inventoryDB.emit('getAvailable', start, end)
    })
  })

  t.updateFails.forEach(({entry, error}) => {
    it('fails to do single update', (done) => {
      inventoryDB.once('error', (err) => {
        expect(err).to.be.an('error')
        expect(err.message).to.equal(error.message)
        done()
      })
      inventoryDB.emit('update', entry)
    })
  })

  t.getAvailableFails.forEach(({start, end, error}) => {
    it('fails to get available inventory', (done) => {
      inventoryDB.once('error', (err) => {
        expect(err).to.be.an('error')
        expect(err.message).to.equal(error.message)
        done()
      })
      inventoryDB.emit('getAvailable', start, end)
    })
  })

  it('fails to do multiple updates', (done) => {
    inventoryDB.once('error', (err) => {
      expect(err).to.be.an('error')
      expect(err.message).to.equal(t.updatesFail.error.message)
      done()
    })
    inventoryDB.emit('updates', t.updatesFail.entries)
  })
})
