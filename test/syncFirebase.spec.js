/* eslint-env node, mocha */
import expect from 'expect'

import {
  incrementCounter,
  syncOptions,
  firebase,
  syncFirebase,
} from './helpers'

describe('syncFirebase', () => {
  let server

	afterEach(function () {
		if (server) {
			server.close()
			server = null
		}
	})

  it('should throw if store is not defined in options', () => {
    expect(() => {
      syncFirebase({
        url: "https://test",
        bindings: {}
      })
    }).toThrow(/Redux store reference not found in options/)

  })

  it('should throw if apiKey and projectId are not defined in options', () => {
    expect(() => {
      syncFirebase({
        bindings: {},
        store: {},
        apiKey: "test"
      })
    }).toThrow(/projectId not found in options/)

    expect(() => {
      syncFirebase({
        bindings: {},
        store: {},
        projectId: "test"
      })
    }).toThrow(/apiKey not found in options/)
  })

  it('should return unsubscribe method which unsubscribes all bindings', () => {
    const data = {
      posts: [],
      user: {},
      counter: 0
    }

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
    }

    let projectId, store
    ({projectId, store, server} = syncOptions({data, bindings}))
    const sync = syncFirebase({
      apiKey: "test",
      store,
      bindings,
      projectId
    })

    expect(Object.keys(sync.refs).length).toBe(3)
    expect(Object.keys(sync.listeners).length).toBe(3)

    sync.unsubscribe()

    expect(Object.keys(sync.refs).length).toBe(0)
    expect(Object.keys(sync.listeners).length).toBe(0)

  })

  it('should populate the state with initial bindings\' data', async (done) => {
    const data = {
			posts: {
        "first": {id: "1", title: "Hello", body: "World"}
      },
      user: {
        name: "Test user",
        email: "test@test.dev",
        reviews: {
          "a": true,
          "c": true
        }
      },
      counter: 5,
      reviews: {
        "a": {
          text: "Very good",
          rating: 5
        },
        "b": {
          text: "Quite ok",
          rating: 4
        },
        "c": {
          text: "Mediocre",
          rating: 3
        }
      }
		}

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
      },
      reviews: {
        path: "user/reviews",
        populate: (key) => `reviews/${key}`
      }
    }

    let projectId, name, store, config
    ({projectId, name, store, server, config} = syncOptions({data, bindings}))
    const sync = syncFirebase({
      apiKey: "test",
      store,
      bindings,
      projectId,
      name,
      ...config
    })

    expect(
      Object.keys(store.getState().firebase.stores).length
    ).toBe(4)

    expect(store.getState().firebase.connected).toBe(false)
    expect(store.getState().firebase.initialFetchDone).toBe(false)

    await sync.initialized

    expect(store.getState().firebase.connected).toBe(true)
    expect(store.getState().firebase.initialFetchDone).toBe(true)

    expect(store.getState().firebase.stores.posts).toEqual({
      key: "posts",
      value: [
        {
          key: "first",
          value: {id: "1", title: "Hello", body: "World"}
        }
      ]
    })
    expect(store.getState().firebase.stores.user).toEqual({
      key: "user",
      value: {name: "Test user", email: "test@test.dev", reviews: {"a": true, "c": true}}
    })
    expect(store.getState().firebase.stores.counter).toEqual({
      key: "counter",
      value: 5
    })
    expect(store.getState().firebase.stores.reviews).toEqual({
      key: "reviews",
      value: [
        {
          key: "a",
          value: {
            rating: 5,
            text: "Very good"
          }
        },
        {
          key: "c",
          value: {
            rating: 3,
            text: "Mediocre"
          }
        }
      ]
    })
    sync.unsubscribe()
    done()
  })

  describe('should update the store state after firebase mutation', () => {

    it('array item added', async () => {
      const data = {
        posts: {"0": {title: "First"}, "1": {title: "Second"}}
      }

      const bindings = {
        posts: {
          type: "Array",
          path: "posts"
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(store.getState().firebase.stores.posts.value).toEqual([
        { key: "0", value: { title: 'First' } },
        { key: "1", value: { title: 'Second' } }
      ])

      const client = firebase.app(name).database().ref(`posts`)
      client.push({
        title: "Third"
      })

      expect(store.getState().firebase.stores.posts.value[0].value).toEqual({title: "First"})
      expect(store.getState().firebase.stores.posts.value[1].value).toEqual({title: "Second"})
      expect(store.getState().firebase.stores.posts.value[2].value).toEqual({title: "Third"})
      sync.unsubscribe()
    })

    it('array item changed', async () => {
      const data = {
        posts: {first: {title: "First"}, second: {title: "Second"}}
      }

      const bindings = {
        posts: {
          type: "Array",
          path: "posts"
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(store.getState().firebase.stores.posts.value).toEqual([
        { key: 'first', value: { title: 'First' } },
        { key: 'second', value: { title: 'Second' } }
      ])

      const client = firebase.app(name).database().ref(`posts/first`)
      client.update({
        title: "Updated title"
      })
      expect(store.getState().firebase.stores.posts.value[0].value).toEqual({title: "Updated title"})
      sync.unsubscribe()
    })

    it('array item removed', async () => {
      const data = {
        posts: {"0": {title: "First"}, "1": {title: "Second"}}
      }

      const bindings = {
        posts: {
          type: "Array",
          path: "posts"
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(store.getState().firebase.stores.posts.value).toEqual([
        { key: "0", value: { title: "First" } },
        { key: "1", value: { title: "Second" } }
      ])

      const client = firebase.app(name).database().ref(`posts/0`)
      client.remove()
      expect(store.getState().firebase.stores.posts.value).toEqual([
        { key: "1", value: { title: "Second" } }
      ])
      sync.unsubscribe()
    })

    it('object changed', async () => {
      const data = {
        user: {name: "Test user", email: "test@test.dev"}
      }

      const bindings = {
        user: {
          type: "Object",
          path: "user"
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(store.getState().firebase.stores.user.value.email).toEqual("test@test.dev")

      const client = firebase.app(name).database().ref(`user`)
      client.update({
        email: "test_user@test.dev"
      })
      expect(store.getState().firebase.stores.user.value.email).toEqual("test_user@test.dev")
      sync.unsubscribe()
    })

    it('primitive changed', async () => {
      const data = {
        counter: 1
      }

      const bindings = {
        counter: {
          path: "counter"
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(store.getState().firebase.stores.counter.value).toEqual(1)

      const client = firebase.app(name).database().ref()
      client.update({
        counter: 2
      })
      expect(store.getState().firebase.stores.counter.value).toEqual(2)
      sync.unsubscribe()
    })

  })

  describe('should subscribe and unsubscribe automatically after path changes', () => {

    it('unsubscribe binding and reset state if path becomes null', async () => {
      const data = {
        user: {name: "Test user", email: "test@test.dev"}
      }

      const bindings = {
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
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(Object.keys(sync.refs).length).toEqual(1)
      expect(Object.keys(sync.listeners).length).toEqual(1)
      expect(store.getState().firebase.stores.user).toEqual({
        key: "user",
        value: {
          name: "Test user",
          email: "test@test.dev"
        }
      })

      store.dispatch(incrementCounter())

      expect(Object.keys(sync.refs).length).toEqual(0)
      expect(Object.keys(sync.listeners).length).toEqual(0)
      expect(store.getState().firebase.stores.user).toEqual(null)
      sync.unsubscribe()
    })

    it('subscribe binding if path changes from null to string', async (done) => {
      const data = {
        user: {name: "Test user", email: "test@test.dev"}
      }

      const bindings = {
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
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(Object.keys(sync.refs).length).toEqual(0)
      expect(Object.keys(sync.listeners).length).toEqual(0)
      expect(store.getState().firebase.stores.user).toEqual(null)

      store.dispatch(incrementCounter())

      const unsubscribe = store.subscribe(() => {
        if (store.getState().firebase.stores.user.value) {
          expect(Object.keys(sync.refs).length).toEqual(1)
          expect(Object.keys(sync.listeners).length).toEqual(1)
          expect(store.getState().firebase.stores.user).toEqual({
            key: "user",
            value: {
              name: "Test user",
              email: "test@test.dev"
            }
          })
          unsubscribe()
          sync.unsubscribe()
          done()
        }
      })
    })

    it('unsubscribe previous binding and subscribe with new path if path is changed', async (done) => {
      const data = {
        users: {
          "1": {
            name: "First user", email: "first@test.dev"
          },
          "2": {
            name: "Second user", email: "second@test.dev"
          }
        }
      }

      const bindings = {
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
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(Object.keys(sync.refs).length).toEqual(1)
      expect(Object.keys(sync.listeners).length).toEqual(1)
      expect(store.getState().firebase.stores.user.value).toEqual({
        name: "First user", email: "first@test.dev"
      })
      const userRef = sync.refs.user
      const userListener = sync.listeners.user

      store.dispatch(incrementCounter())

      const unsubscribe = store.subscribe(() => {
        expect(Object.keys(sync.refs).length).toEqual(1)
        expect(Object.keys(sync.listeners).length).toEqual(1)
        expect(store.getState().firebase.stores.user.value).toEqual({
          name: "Second user", email: "second@test.dev"
        })
        expect(userRef).toNotEqual(sync.refs.user)
        expect(userListener).toNotBe(sync.listeners.user)
        unsubscribe()
        sync.unsubscribe()
        done()
      })
    })

    it('unsubscribe previous binding and subscribe again with new query if query is changed', async (done) => {
      const data = {
        users: {
          "1": {
            name: "First user", email: "first@test.dev"
          },
          "2": {
            name: "Second user", email: "second@test.dev"
          }
        }
      }

      const bindings = {
        users: {
          type: "Array",
          path: "users",
          query: (ref, state) => ref.limitToFirst(state.counter)
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      await sync.initialized

      expect(Object.keys(sync.refs).length).toEqual(1)
      expect(Object.keys(sync.listeners).length).toEqual(1)
      expect(store.getState().firebase.stores.users.value.length).toEqual(1)

      const usersListener = sync.listeners.users

      store.dispatch(incrementCounter())

      const unsubscribe = store.subscribe(() => {
        expect(Object.keys(sync.refs).length).toEqual(1)
        expect(Object.keys(sync.listeners).length).toEqual(1)
        expect(store.getState().firebase.stores.users.value.length).toEqual(2)
        expect(usersListener).toNotBe(sync.listeners.users)
        unsubscribe()
        sync.unsubscribe()
        done()
      })
    })

    it('populate should be cancelled when binding is unsubscribed', async (done) => {
      const data = {
        userReviews: {
          "2": {
            "a": true,
            "d": true,
            "f": true
          },
          "4": {
            "b": true,
            "c": true,
            "e": true
          }
        },
        reviews: {
          "a": { rating: 5 },
          "b": { rating: 4 },
          "c": { rating: 3 },
          "d": { rating: 4 },
          "e": { rating: 5 },
          "f": { rating: 4 }
        }
      }

      const bindings = {
        userReviews: {
          path: (state) => {
            return (state.counter === 2 || state.counter === 4)
              ? `userReviews/${state.counter}`
              : null
          },
          populate: (key) => `reviews/${key}`
        }
      }

      let projectId, name, store, config
      ({projectId, name, store, server, config} = syncOptions({data, bindings}))
      const sync = syncFirebase({
        apiKey: "test",
        store,
        bindings,
        projectId,
        name,
        ...config
      })

      expect(
        Object.keys(store.getState().firebase.stores).length
      ).toBe(1)

      await sync.initialized

      store.dispatch(incrementCounter())

      new Promise((resolve) => {
        const unsubscribe = store.subscribe(() => {
          const userReviews = store.getState().firebase.stores.userReviews
          expect(userReviews.key).toBe("2")
          expect(userReviews.value.map(review => review.key)).toEqual(["a", "d", "f"])
          unsubscribe()
          resolve()
        })
      }).then(() => {
        new Promise((resolve) => {
          const unsubscribe = store.subscribe(() => {
            expect(store.getState().firebase.stores.userReviews).toEqual(null)
            unsubscribe()
            resolve()
          })
          store.dispatch(incrementCounter())
        }).then(() => {
          store.dispatch(incrementCounter())
          const unsubscribe = store.subscribe(() => {
            const userReviews = store.getState().firebase.stores.userReviews
            expect(userReviews.key).toBe("4")
            expect(userReviews.value.map(review => review.key)).toEqual(["b", "c", "e"])
            unsubscribe()
            sync.unsubscribe()
            done()
          })
        })
      })

    })

  })

})
