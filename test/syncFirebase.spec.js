import expect from 'expect';
import firebaseReducer from '../src/reducers/firebase';

import FirebaseServer from 'firebase-server';
import originalWebsocket from 'faye-websocket';
import assert from 'assert';
import proxyquire from 'proxyquire';

import { applyMiddleware, createStore, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';

// TODO: extract all test helpers to a separate file

const PORT = 45000;
const INCREMENT_COUNTER = "INCREMENT_COUNTER";

// Firebase has strict requirements about the hostname format. So we provide a dummy
// hostname and then change the URL to localhost inside the faye-websocket's Client
// constructor.
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

function initServer(data) {
  return new FirebaseServer(PORT, 'localhost:' + PORT, data);
}

function initStore(bindings, extraReducers = {}) {
  return compose(
    applyMiddleware(thunk)
  )(createStore)(
    combineReducers({
      firebase: firebaseReducer(bindings),
      ...extraReducers
    })
  );
}

function createReducer(initialState, handlers) {
  return (state = initialState, action) => {
    return handlers[action.type]
      ? handlers[action.type](state, action)
      : state;
  }
}

function initCounterReducer() {
  return createReducer(1, {
    [INCREMENT_COUNTER]: (state, action) => state + 1
  });
}
const incrementCounter = id => ({ type: INCREMENT_COUNTER });

describe('syncFirebase', () => {
  let server;
  let sequentialConnectionId = 0;

	afterEach(function () {
		if (server) {
			server.close();
			server = null;
		}
	});

	function newServerUrl() {
		return 'ws://dummy' + (sequentialConnectionId++) + '.firebaseio.test:' + PORT + '/';
	}

  it('should throw if store is not defined in options', () => {
    expect(() => {
      syncFirebase({
        url: "https://test",
        bindings: {}
      });
    }).toThrow(/Redux store reference not found in options/);

  });

  it('should throw if url is not defined in options', () => {
    expect(() => {
      syncFirebase({
        bindings: {},
        store: {}
      });
    }).toThrow(/Firebase url not found in options/);
  });

  it('should return unsubscribe method which unsubscribes all bindings', () => {
    server = initServer({
      posts: [],
      user: {},
      counter: 0
    });

    const bindings = {
      posts: {
        type: "Array",
        path: "posts"
      },
      user: {
        type: "Object",
        path: "user"
      },
      counter: {
        path: "counter"
      }
    };

    const store = initStore(bindings);
    const sync = syncFirebase({
      store: store,
      bindings: bindings,
      url: newServerUrl()
    });

    expect(Object.keys(sync.refs).length).toBe(3);
    expect(Object.keys(sync.listeners).length).toBe(3);

    sync.unsubscribe();

    expect(Object.keys(sync.refs).length).toBe(0);
    expect(Object.keys(sync.listeners).length).toBe(0);

  });

  it('should populate the state with initial bindings\' data', async () => {
    server = initServer({
			posts: {
        "first": {id: 1, title: "Hello", body: "World"}
      },
      user: {name: "Test user", email: "test@test.dev"},
      counter: 5
		});

    const bindings = {
      posts: {
        type: "Array",
        path: "posts"
      },
      user: {
        type: "Object",
        path: "user"
      },
      counter: {
        path: "counter"
      }
    };

    const store = initStore(bindings);
    const sync = syncFirebase({
      store: store,
      bindings: bindings,
      url: newServerUrl()
    });
    expect(
      Object.keys(store.getState().firebase.stores).length
    ).toBe(3);

    expect(store.getState().firebase.connected).toBe(false);
    expect(store.getState().firebase.initialFetchDone).toBe(false);

    await sync.initialized;

    expect(store.getState().firebase.connected).toBe(true);
    expect(store.getState().firebase.initialFetchDone).toBe(true);

    expect(store.getState().firebase.stores.posts).toEqual({
      key: "posts",
      value: [
        {
          key: "first",
          value: {id: 1, title: "Hello", body: "World"}
        }
      ]
    });
    expect(store.getState().firebase.stores.user).toEqual({
      key: "user",
      value: {name: "Test user", email: "test@test.dev"}
    });
    expect(store.getState().firebase.stores.counter).toEqual({
      key: "counter",
      value: 5
    });
  });

  describe('should update the store state after firebase mutation', () => {

    // TODO: pending for .push support in firebase-server, changes are not broadcasted to client
    it('array item added');

    // TODO: pending for proper .child().update support in firebase-server, changes are not broadcasted to client
    it('array item changed');

    // TODO: pending for proper .child().update support in firebase-server, changes are not broadcasted to client
    it('array item moved');

    // TODO: pending for proper .child().update support in firebase-server, changes are not broadcasted to client
    it('array item removed');

    it('object changed', async () => {
      server = initServer({
        user: {name: "Test user", email: "test@test.dev"}
      });

      const bindings = {
        user: {
          type: "Object",
          path: "user"
        }
      };

      const store = initStore(bindings);
      const url = newServerUrl();
      const sync = syncFirebase({
        store: store,
        bindings: bindings,
        url: url
      });
      await sync.initialized;
      expect(store.getState().firebase.stores.user.value.email).toEqual("test@test.dev");

      const client = new Firebase(`${url}user`);
      client.update({
        email: "test_user@test.dev"
      });
      expect(store.getState().firebase.stores.user.value.email).toEqual("test_user@test.dev");
    });

    it('primitive changed', async () => {
      server = initServer({
        counter: 1
      });

      const bindings = {
        counter: {
          path: "counter"
        }
      };

      const store = initStore(bindings);
      const url = newServerUrl();
      const sync = syncFirebase({
        store: store,
        bindings: bindings,
        url: url
      });
      await sync.initialized;
      expect(store.getState().firebase.stores.counter.value).toEqual(1);

      const client = new Firebase(url);
      client.update({
        counter: 2
      });
      expect(store.getState().firebase.stores.counter.value).toEqual(2);
    });

  });

  describe('should subscribe and unsubscribe automatically after path changes', () => {

    it('unsubscribe binding and reset state if path becomes null', async () => {
      server = initServer({
        user: {name: "Test user", email: "test@test.dev"}
      });

      const bindings = {
        user: {
          type: "Object",
          path: state => {
            if (state.counter === 1) {
              return "user"
            } else {
              return null;
            }
          }
        }
      };

      const store = initStore(bindings, {
        counter: initCounterReducer()
      });

      const url = newServerUrl();
      const sync = syncFirebase({
        store: store,
        bindings: bindings,
        url: url
      });
      await sync.initialized;

      expect(Object.keys(sync.refs).length).toEqual(1);
      expect(Object.keys(sync.listeners).length).toEqual(1);
      expect(store.getState().firebase.stores.user).toEqual({
        key: "user",
        value: {
          name: "Test user",
          email: "test@test.dev"
        }
      });

      store.dispatch(incrementCounter());

      expect(Object.keys(sync.refs).length).toEqual(0);
      expect(Object.keys(sync.listeners).length).toEqual(0);
      expect(store.getState().firebase.stores.user).toEqual(null);
    });

    it('subscribe binding if path changes from null to string', async (done) => {
      server = initServer({
        user: {name: "Test user", email: "test@test.dev"}
      });

      const bindings = {
        user: {
          type: "Object",
          path: state => {
            if (state.counter === 1) {
              return null;
            } else {
              return "user";
            }
          }
        }
      };

      const store = initStore(bindings, {
        counter: initCounterReducer()
      });

      const url = newServerUrl();
      const sync = syncFirebase({
        store: store,
        bindings: bindings,
        url: url
      });
      await sync.initialized;

      expect(Object.keys(sync.refs).length).toEqual(0);
      expect(Object.keys(sync.listeners).length).toEqual(0);
      expect(store.getState().firebase.stores.user).toEqual(null);

      store.dispatch(incrementCounter());

      const unsubscribe = store.subscribe(() => {
        if (store.getState().firebase.stores.user.value) {
          expect(Object.keys(sync.refs).length).toEqual(1);
          expect(Object.keys(sync.listeners).length).toEqual(1);
          expect(store.getState().firebase.stores.user).toEqual({
            key: "user",
            value: {
              name: "Test user",
              email: "test@test.dev"
            }
          });
          unsubscribe();
          done();
        }
      });
    });

    it('unsubscribe previous binding and subscribe with new path if path is changed', async (done) => {
      server = initServer({
        users: {
          1: {
            name: "First user", email: "first@test.dev"
          },
          2: {
            name: "Second user", email: "second@test.dev"
          }
        }
      });

      const bindings = {
        users: {
          type: "Array",
          path: "users"
        },
        user: {
          type: "Object",
          path: state => {
            if (state.counter === 1) {
              return "users/1";
            } else {
              return "users/2";
            }
          }
        }
      };

      const store = initStore(bindings, {
        counter: initCounterReducer()
      });

      const url = newServerUrl();
      const sync = syncFirebase({
        store: store,
        bindings: bindings,
        url: url
      });
      await sync.initialized;

      expect(Object.keys(sync.refs).length).toEqual(2);
      expect(Object.keys(sync.listeners).length).toEqual(2);
      expect(store.getState().firebase.stores.user.value).toEqual({
        name: "First user", email: "first@test.dev"
      });
      const userRef = sync.refs.user;
      const userListener = sync.listeners.user;

      store.dispatch(incrementCounter());

      const unsubscribe = store.subscribe(() => {
        expect(Object.keys(sync.refs).length).toEqual(2);
        expect(Object.keys(sync.listeners).length).toEqual(2);
        expect(store.getState().firebase.stores.user.value).toEqual({
          name: "Second user", email: "second@test.dev"
        });
        expect(userRef).toNotEqual(sync.refs.user);
        expect(userListener).toNotEqual(sync.listeners.user);
        unsubscribe();
        done();
      });
    });

  });

});
