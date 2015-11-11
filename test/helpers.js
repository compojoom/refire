import FirebaseServer from 'firebase-server';
import { applyMiddleware, createStore, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import proxyquire from 'proxyquire';
import originalWebsocket from 'faye-websocket';
import firebaseReducer from '../src/reducers/firebase';

const Firebase = proxyquire('firebase', {
  'faye-websocket': {
    Client: function (url) {
      url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost').replace('wss://', 'ws://');
      return new originalWebsocket.Client(url);
    }
  }
});

const syncFirebase = proxyquire('../src/syncFirebase', {
  'firebase': Firebase
});

const INCREMENT_COUNTER = "INCREMENT_COUNTER";

function createReducer(initialState, handlers) {
  return (state = initialState, action) => {
    return handlers[action.type]
      ? handlers[action.type](state, action)
      : state;
  }
}

export function initServer(data, port) {
  return new FirebaseServer(port, 'localhost:' + port, data);
}

export function initStore(bindings, extraReducers = {}) {
  return compose(
    applyMiddleware(thunk)
  )(createStore)(
    combineReducers({
      firebase: firebaseReducer(bindings),
      ...extraReducers
    })
  );
}

export function initCounterReducer() {
  return createReducer(1, {
    [INCREMENT_COUNTER]: (state, action) => state + 1
  });
}

export const incrementCounter = id => ({ type: INCREMENT_COUNTER });

export function initSync(options = {}) {
  const {bindings, data, port, url} = options;
  const server = initServer(data, port);
  const store = initStore(bindings, {counter: initCounterReducer()});
  const {initialized, unsubscribe} = syncFirebase({
    store: store,
    bindings: bindings,
    url: url
  });
  return {initialized, server, store, unsubscribe};
}