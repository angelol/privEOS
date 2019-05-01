'use strict'
const cache = require('./cache')
const Promise = require('bluebird')

test('cache', async () => {
  cache.get_or_set('xxx', function() { return 'yy'}, 3)
  
  expect(cache.get('xxx')).toStrictEqual('yy')
  await Promise.delay(1000)
  expect(cache.get('xxx')).toStrictEqual('yy')
  await Promise.delay(1000)
  expect(cache.get('xxx')).toStrictEqual('yy')
  await Promise.delay(1001)
  expect(() => {
    cache.get('xxx')
  }).toThrow('Expired')
})

test('test get_or_set laziness', async () => {
  let call_counter = 0
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  await Promise.delay(1000)
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  await Promise.delay(1000)
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  expect(call_counter).toBe(1)
  await Promise.delay(1001)
  cache.get_or_set('xxx', function() { call_counter++; return 'yy'}, 3)
  expect(call_counter).toBe(2)
})

test('async', async () => {
  await cache.get_or_set_async('async', async function() { return 'yy'}, 3)
  expect(cache.get('async')).toStrictEqual('yy')
})
