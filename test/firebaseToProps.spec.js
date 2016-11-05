/* eslint-env node, mocha */
import expect from 'expect'
import React, { Children, PropTypes, Component } from 'react'
import TestUtils from 'react-addons-test-utils'
import { connect } from 'react-redux'
import get from 'lodash/get'
import { firebaseToProps } from '../src/index'
import {
  initSync,
  incrementCounter
} from './helpers'

describe('React', () => {
  describe('firebaseToProps selector', () => {
    let server
    let unsubscribe

  	afterEach(function () {
  		if (server) {
  			server.close()
  			server = null
  		}
      if (unsubscribe) {
        unsubscribe()
      }
  	})

    class ProviderMock extends Component {
      static childContextTypes = {
        store: PropTypes.object.isRequired
      }

      constructor(props) {
        super(props)
      }

      getChildContext() {
        return {
          store: this.props.store
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

    it('should provide _status', async () => {
      let initialized, store, name

      ({initialized, server, unsubscribe, store, name} = initSync({
        bindings: {},
        data: {}
      }))

      await initialized

      @connect(firebaseToProps(["_status"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props._status).toEqual({
        authenticatedUser: null,
        connected: true,
        initialFetchDone: true,
        name: name,
        errors: {
          permissions: null,
          login: null,
          createUser: null,
          resetPassword: null
        },
        processing: {
          login: false,
          createUser: false,
          resetPassword: false
        },
        completed: {
          login: false,
          createUser: false,
          resetPassword: false
        },
        writes: {
          errors: {},
          processing: {}
        }
      })
    })

    it('should map primitives as props', async () => {
      let initialized, store
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {counter: {path: "counter"}},
        data: {counter: 5}
      }))

      await initialized

      @connect(firebaseToProps(["counter"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props.counter).toEqual({ key: 'counter', value: 5 })
    })

    it('should map arrays as props', async () => {
      let initialized, store
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
        }
      }))

      await initialized

      @connect(firebaseToProps(["posts"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
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
      })
    })

    it('should map objects as props', async () => {
      let initialized, store
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: { user: {type: "Object", path: "user"} },
        data: { user: {name: "Test user", email: "test@test.dev"} }
      }))

      await initialized

      @connect(firebaseToProps(["user"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props.user).toEqual({
        key: "user",
        value: {name: "Test user", email: "test@test.dev"}
      })
    })

    it('should map prop as null if unsubscribed', async () => {
      let initialized, store
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
          user: {
            type: "Object",
            path: state => {
              if (state.counter === 1) {
                return "user"
              } else {
                return null
              }
            }
          }
        },
        data: { user: {name: "Test user", email: "test@test.dev"} }
      }))

      await initialized

      @connect(firebaseToProps(["user"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      let stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props.user).toEqual({
        key: "user",
        value: {name: "Test user", email: "test@test.dev"}
      })

      store.dispatch(incrementCounter())

      stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props.user).toEqual(null)
    })

    it('should map prop value if subscribed', async (done) => {
      let initialized, store
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
          user: {
            type: "Object",
            path: state => {
              if (state.counter === 1) {
                return null
              } else {
                return "user"
              }
            }
          }
        },
        data: { user: {name: "Test user", email: "test@test.dev"} }
      }))

      await initialized

      @connect(firebaseToProps(["user"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      let stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props.user).toEqual(null)

      store.dispatch(incrementCounter())

      const unsub = store.subscribe(() => {
        const state = get(store.getState(), 'firebase.stores.user')
        if (state && state.value !== null) {
          expect(stub.props.user).toEqual({
            key: "user",
            value: {name: "Test user", email: "test@test.dev"}
          })
          unsub()
          done()
        }
      })
    })

    it('should map correct value if unsubscribed & resubscribed', async (done) => {
      let initialized, store
      ({initialized, server, unsubscribe, store} = initSync({
        bindings: {
          user: {
            type: "Object",
            path: state => {
              if (state.counter === 1) {
                return "users/1"
              } else {
                return "users/2"
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
        }
      }))

      await initialized

      @connect(firebaseToProps(["user"]))
      class Counter extends Component {
        render() {
          return <Passthrough {...this.props} />
        }
      }

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store}>
          <Counter />
        </ProviderMock>
      )

      let stub = TestUtils.findRenderedComponentWithType(tree, Passthrough)
      expect(stub.props.user).toEqual({
        key: "1",
        value: {name: "First user", email: "first@test.dev"}
      })

      store.dispatch(incrementCounter())

      const unsub = store.subscribe(() => {
        const state = get(store.getState(), 'firebase.stores.user')
        if (state && state.value !== null) {
          expect(stub.props.user).toEqual({
            key: "2",
            value: {name: "Second user", email: "second@test.dev"}
          })
          unsub()
          done()
        }
      })
    })

  })
})
