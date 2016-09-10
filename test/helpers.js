import FirebaseServer from 'firebase-server'
import { applyMiddleware, createStore, compose, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import proxyquire from 'proxyquire'
import originalWebsocket from 'faye-websocket'
import firebaseReducer from '../src/reducers/firebase'
import createReducer from '../src/helpers/createReducer'

let sequentialConnectionId = 0
const PORT = 45000

export const firebase = proxyquire('firebase', {
  'faye-websocket': {
    Client: function (url) {
      url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost')
      return new originalWebsocket.Client(url)
    },
    '@global': true
  }
})

firebase.INTERNAL.factories.auth = function(app, extendApp) {
	const _listeners = []
	const token = null
	extendApp({
		'INTERNAL': {
			'getToken': function() {
				if (!token) {
					return Promise.resolve(null)
				}
				_listeners.forEach(function(listener) {
					listener(token)
				})
				return Promise.resolve({ accessToken: token, expirationTime: 1566618502074 })
			},
			'addAuthTokenListener': function(listener) {
				_listeners.push(listener)
			}
		}
	})
}

const createOptions = proxyquire('../src/syncFirebase/createOptions', {
  'firebase': firebase
})

const subscribe = proxyquire('../src/syncFirebase/subscribe', {
  'firebase': firebase
})

const actions = proxyquire('../src/actions/firebase', {
  'firebase': firebase
})

export const syncFirebase = proxyquire('../src/syncFirebase', {
  'firebase': firebase,
  './syncFirebase/createOptions': createOptions,
  './syncFirebase/subscribe': subscribe,
  './actions/firebase': actions
})

const INCREMENT_COUNTER = "INCREMENT_COUNTER"

export function initServer(data, port) {
  return new FirebaseServer(port, 'localhost:' + port, data)
}

export function initStore(bindings, extraReducers = {}) {
  return compose(
    applyMiddleware(thunk)
  )(createStore)(
    combineReducers({
      firebase: firebaseReducer(bindings),
      ...extraReducers
    })
  )
}

export function initCounterReducer() {
  return createReducer(1, {
    [INCREMENT_COUNTER]: (state) => state + 1
  })
}

export const incrementCounter = () => ({ type: INCREMENT_COUNTER })

function newProjectId() {
  return `dummy${sequentialConnectionId++}`
}

function generateServerConfig(projectId) {
  return {
    databaseURL: `ws://${projectId}.firebaseio.test:${PORT}`,
    serviceAccount: {
      'private_key': 'fake',
      'client_email': 'fake'
    },
    name: `test-firebase-client-${projectId}`
  }
}

export function syncOptions(options = {}) {
  const {bindings, data} = options
  const server = initServer(data, PORT)
  const store = initStore(bindings, {counter: initCounterReducer()})
  const projectId = newProjectId()
  const {name, ...config} = generateServerConfig(projectId)
  return {
    bindings,
    server,
    store,
    projectId,
    name,
    config
  }
}

export function initSync(options = {}) {
  const {bindings, server, store, projectId, name, config} = syncOptions(options)
  const {initialized, unsubscribe} = syncFirebase({
    store,
    bindings,
    apiKey: "test",
    projectId,
    name,
    ...config
  })

  return {initialized, server, store, unsubscribe, name}
}
