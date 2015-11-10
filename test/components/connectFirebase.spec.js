import expect from 'expect';
import React, { createClass, Children, PropTypes, Component } from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import { createStore } from 'redux';

import originalWebsocket from 'faye-websocket';
import proxyquire from 'proxyquire';

const Firebase = proxyquire('firebase', {
  'faye-websocket': {
    Client: function (url) {
      url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost').replace('wss://', 'ws://');
      return new originalWebsocket.Client(url);
    }
  }
});

import { connectFirebase } from '../../src/index';
import {
  initServer,
  initStore,
  initSync,
  initCounterReducer,
  incrementCounter
} from '../helpers';

const PORT = 46000;

describe('React', () => {
  describe('connectFirebase', () => {
    let server;
    let unsubscribe;
    let sequentialConnectionId = 0;

  	afterEach(function () {
  		if (server) {
  			server.close();
  			server = null;
  		}
      if (unsubscribe) {
        unsubscribe();
      }
  	});

  	function newServerUrl() {
  		return 'ws://dummy' + (sequentialConnectionId++) + '.firebaseio.test:' + PORT + '/';
  	}

    class ProviderMock extends Component {
      static childContextTypes = {
        store: PropTypes.object.isRequired,
        firebase: PropTypes.object.isRequired
      }

      constructor(props) {
        super(props);
        this.firebase = new Firebase(props.url);
      }

      getChildContext() {
        return {
          store: this.props.store,
          firebase: this.firebase
        }
      }

      render() {
        return Children.only(this.props.children)
      }
    }

    class Passthrough extends Component {
      render() {
        return <div {...this.props} />
      }
    }

    it('should provide _status and Firebase ref as firebase prop', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {},
        data: {},
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["_status"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props._status).toEqual({
        authenticatedUser: null,
        connected: true,
        initialFetchDone: true
      });
      expect(stub.props.firebase).toBeA(Firebase);
    });

    it('should map primitives as props', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {counter: {path: "counter"}},
        data: {counter: 5},
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["counter"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.counter).toEqual({ key: 'counter', value: 5 });
    });

    it('should map arrays as props', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
          posts: {
            type: "Array",
            path: "posts"
          }
        },
        data: {
          posts: {
            "first": {id: 1, title: "Hello", body: "World"}
          }
        },
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["posts"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.posts).toEqual({
        key: 'posts',
        value: [
          {
            key: 'first',
            value: {
              body: 'World',
              id: 1,
              title: 'Hello'
            }
          }
        ]
      });
    });

    it('should map objects as props', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: { user: {type: "Object", path: "user"} },
        data: { user: {name: "Test user", email: "test@test.dev"} },
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["user"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.user).toEqual({
        key: "user",
        value: {name: "Test user", email: "test@test.dev"}
      });
    });

    it('should map prop as null if unsubscribed', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
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
        },
        data: { user: {name: "Test user", email: "test@test.dev"} },
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["user"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      let stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.user).toEqual({
        key: "user",
        value: {name: "Test user", email: "test@test.dev"}
      });

      store.dispatch(incrementCounter());

      stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.user).toEqual(null);
    });

    it('should map prop value if subscribed', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
          user: {
            type: "Object",
            path: state => {
              if (state.counter === 1) {
                return null;
              } else {
                return "user"
              }
            }
          }
        },
        data: { user: {name: "Test user", email: "test@test.dev"} },
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["user"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      let stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.user).toEqual(null);

      store.dispatch(incrementCounter());

      const unsub = store.subscribe(() => {
        stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
        expect(stub.props.user).toEqual({
          key: "user",
          value: {name: "Test user", email: "test@test.dev"}
        });
        unsub();
      });
    });

    it('should map correct value if unsubscribed & resubscribed', async () => {
      let initialized, store;
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
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
        },
        data: {
          users: {
            1: {
              name: "First user", email: "first@test.dev"
            },
            2: {
              name: "Second user", email: "second@test.dev"
            }
          }
        },
        port: PORT,
        url: newServerUrl()
      }));

      await initialized;

      @connectFirebase(state => ({firebase: ["user"]}))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} url="https://dummy1.firebaseio.test/">
          <Counter />
        </ProviderMock>
      );

      let stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.user).toEqual({
        key: "1",
        value: {name: "First user", email: "first@test.dev"}
      });

      store.dispatch(incrementCounter());

      const unsub = store.subscribe(() => {
        stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
        expect(stub.props.user).toEqual({
          key: "2",
          value: {name: "Second user", email: "second@test.dev"}
        });
        unsub();
      });
    });

  });
});
