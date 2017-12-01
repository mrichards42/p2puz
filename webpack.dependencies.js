// Dependency map
const DEPENDENCIES = {
  'lodash': {global: '_', src: 'https://cdn.jsdelivr.net/npm/lodash@4.17.4/lodash.min.js'},
  'jquery': {global: 'jQuery', src: 'https://code.jquery.com/jquery-3.2.1.min.js'},
  'mousetrap': {global: 'Mousetrap', src: 'https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.1/mousetrap.min.js'},
  'pubnub': {global: 'PubNub', src: 'https://cdn.pubnub.com/sdk/javascript/pubnub.4.17.0.min.js'},
  'simple-peer': {global: 'SimplePeer', src: 'https://cdnjs.cloudflare.com/ajax/libs/simple-peer/8.1.1/simplepeer.min.js'},
  'localforage': {global: 'localforage', src: 'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.5.3/localforage.min.js'},
}

// Filter modules by name
function filter(...modules) {
  return modules.map(name => DEPENDENCIES[name])
}

// Get src of given modules
function src(...modules) {
  return filter(...modules).map(d => d.src)
}

// Get externals definition
function externals() {
  const obj = {}
  for (const k in DEPENDENCIES) obj[k] = DEPENDENCIES[k].global
  return obj
}

module.exports = {filter, src, externals}
