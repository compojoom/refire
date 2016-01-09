import Firebase from 'firebase'
import isEqual from 'lodash/lang/isEqual'
import difference from 'lodash/array/difference'
import intersection from 'lodash/array/intersection'

import {
  addArrayChild,
  changeArrayChild,
  moveArrayChild,
  removeArrayChild,
  updateArray,
  updateObject,
  replaceValue,
  receiveInitialValue,
  completeInitialFetch,
  connect,
  authenticateUser,
  unauthenticateUser,
  updateConfig
} from './actions/firebase'

function dispatchChildAdded(store, localBinding) {
  return (snapshot, previousChildKey) => {
    return store.dispatch(
      addArrayChild(localBinding, snapshot, previousChildKey)
    )
  }
}

function dispatchChildChanged(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      changeArrayChild(localBinding, snapshot)
    )
  }
}

function dispatchChildMoved(store, localBinding) {
  return (snapshot, previousChildKey) => {
    return store.dispatch(
      moveArrayChild(localBinding, snapshot, previousChildKey)
    )
  }
}

function dispatchChildRemoved(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      removeArrayChild(localBinding, snapshot)
    )
  }
}

function dispatchArrayUpdated(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      updateArray(localBinding, snapshot)
    )
  }
}

function dispatchObjectUpdated(store, localBinding, snapshot) {
  return store.dispatch(
    updateObject(localBinding, snapshot)
  )
}

function dispatchInitialValueReceived(store, localBinding) {
  return store.dispatch(receiveInitialValue(localBinding))
}

function unsubscribe(localBinding, ref, listeners) {
  for (const event in listeners) {
    if (listeners.hasOwnProperty(event)) {
      ref.off(event, listeners[event])
    }
  }
}

function unsubscribeAll(refs, listeners) {
  for (const localBinding in refs) {
    if (refs.hasOwnProperty(localBinding)) {
      unsubscribe(localBinding, refs[localBinding], listeners[localBinding])
      delete refs[localBinding]
      delete listeners[localBinding]
    }
  }
}

function subscribe(localBinding, bindOptions, options) {
  const {type, query} = bindOptions
  const {store, onCancel} = options
  const listeners = {}

  if (type === "Array") {
    let initialValueReceived = false

    // only listen child_added for new items after initial fetch is done
    listeners.child_added = query.on(
      'child_added',
      (snapshot, previousChildKey) => {
        if (initialValueReceived) {
          dispatchChildAdded(store, localBinding)(snapshot, previousChildKey)
        }
      },
      onCancel
    )

    // add listeners for rest of 'child_*' events
    listeners.child_changed = query.on('child_changed', dispatchChildChanged(store, localBinding), onCancel)
    listeners.child_moved = query.on('child_moved', dispatchChildMoved(store, localBinding), onCancel)
    listeners.child_removed = query.on('child_removed', dispatchChildRemoved(store, localBinding), onCancel)

    // listen for array value once to prevent multiple updates on initial items
    listeners.value = query.once('value', (snapshot) => {
      dispatchInitialValueReceived(store, localBinding)
      dispatchArrayUpdated(store, localBinding)(snapshot)
      initialValueReceived = true
    }, onCancel)
  } else {
    listeners.value = query.on('value', (snapshot) => {
      dispatchInitialValueReceived(store, localBinding)
      dispatchObjectUpdated(store, localBinding, snapshot)
    }, onCancel)
  }

  return {
    ref: query.ref(),
    listeners: listeners
  }
}

function buildQueryState() {
  let state = {}
  return {
    orderByChild(order) {
      state = { ...state, orderByChild: order }
      return this
    },
    orderByKey(order) {
      state = { ...state, orderByKey: order }
      return this
    },
    orderByValue(order) {
      state = { ...state, orderByValue: order }
      return this
    },
    orderByPriority(order) {
      state = { ...state, orderByPriority: order }
      return this
    },
    startAt(start) {
      state = { ...state, startAt: start }
      return this
    },
    endAt(end) {
      state = { ...state, endAt: end }
      return this
    },
    equalTo(equalTo) {
      state = { ...state, equalTo: equalTo }
      return this
    },
    limitToFirst(limit) {
      state = { ...state, limitToFirst: limit }
      return this
    },
    limitToLast(limit) {
      state = { ...state, limitToLast: limit }
      return this
    },
    getState() {
      return state
    }
  }
}

function createBindings(bindings, state, url) {
  return Object.keys(bindings).reduce((result, localBinding) => {

    const path = typeof bindings[localBinding].path === "function"
      ? bindings[localBinding].path(state)
      : bindings[localBinding].path

    if (path) {
      const queryState = typeof bindings[localBinding].query === "function"
        ? bindings[localBinding].query(buildQueryState(), state).getState()
        : bindings[localBinding].query

      const firebaseRef = new Firebase(`${url}${path}`)

      const query = bindings[localBinding].query
        ? bindings[localBinding].query(firebaseRef, state)
        : firebaseRef

      result[localBinding] = {
        ...bindings[localBinding],
        path: path,
        query: query,
        queryState: queryState
      }
    }
    return result
  }, {})
}

export default function syncFirebase(options = {}) {

  const {
    store,
    url,
    bindings: initialBindings = {},
    onCancel = () => {},
    onAuth
  } = options

  if (typeof store === "undefined") {
    throw new Error("syncFirebase: Redux store reference not found in options")
  }

  if (typeof url === "undefined") {
    throw new Error("syncFirebase: Firebase url not found in options")
  }

  store.dispatch(updateConfig({url: url}))

  const rootRef = new Firebase(url)
  const firebaseRefs = {}
  const firebaseListeners = {}

  let currentBindings = createBindings(initialBindings, store.getState(), url)
  store.subscribe(() => {
    const previousBindings = {...currentBindings}
    const nextBindings = createBindings(initialBindings, store.getState(), url)

    if ( !isEqual(currentBindings, nextBindings) ) {
      const subscribed = difference(Object.keys(nextBindings), Object.keys(currentBindings))
      const unsubscribed = difference(Object.keys(currentBindings), Object.keys(nextBindings))
      const remaining = intersection(Object.keys(currentBindings), Object.keys(nextBindings))
      currentBindings = nextBindings

      // unsubscribe removed bindings
      unsubscribed.forEach(localBinding => {
        unsubscribe(localBinding, firebaseRefs[localBinding], firebaseListeners[localBinding])
        delete firebaseRefs[localBinding]
        delete firebaseListeners[localBinding]

        // reset store value to null
        store.dispatch(replaceValue(localBinding, null))
      })

      // subscribe new bindings
      subscribed.forEach(localBinding => {
        const {ref, listeners} = subscribe(
          localBinding,
          currentBindings[localBinding],
          {
            store: store,
            onCancel: onCancel
          }
        )
        firebaseRefs[localBinding] = ref
        firebaseListeners[localBinding] = listeners
      })

      // check if subscription paths or queries have changed
      remaining.forEach(localBinding => {
        if (
          !isEqual(currentBindings[localBinding].path, previousBindings[localBinding].path) ||
          !isEqual(currentBindings[localBinding].queryState, previousBindings[localBinding].queryState)
        ) {
          // unsubscribe
          unsubscribe(localBinding, firebaseRefs[localBinding], firebaseListeners[localBinding])
          delete firebaseRefs[localBinding]
          delete firebaseListeners[localBinding]

          // resubscribe with new path / query
          const {ref, listeners} = subscribe(
            localBinding,
            currentBindings[localBinding],
            {
              store: store,
              onCancel: onCancel
            }
          )
          firebaseRefs[localBinding] = ref
          firebaseListeners[localBinding] = listeners
        }
      })

    }
  })

  rootRef.child('.info/connected')
  .on('value', snapshot => {
    if (snapshot.val() === true) {
      store.dispatch(connect())
    }
  })

  rootRef.onAuth(function(authData) {
    if (authData) {
      store.dispatch(authenticateUser(authData))
    } else {
      store.dispatch(unauthenticateUser())
    }
    if (onAuth && typeof onAuth === "function") {
      onAuth(authData)
    }
  })

  Object.keys(currentBindings).forEach(localBinding => {
    const {ref, listeners} = subscribe(
      localBinding,
      currentBindings[localBinding],
      {
        store: store,
        onCancel: onCancel
      }
    )
    firebaseRefs[localBinding] = ref
    firebaseListeners[localBinding] = listeners
  })

  // immediately mark initial fetch completed if we aren't initially subscribed to any stores
  if (!Object.keys(currentBindings).length) {
    store.dispatch(completeInitialFetch())
  }

  const initialized = new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const {firebase} = store.getState()
      if (firebase.connected && firebase.initialFetchDone) {
        resolve()
        unsubscribe()
      }
    })
  })

  return Object.defineProperties({
    unsubscribe: () => unsubscribeAll(firebaseRefs, firebaseListeners)
  }, {
    refs: {
      enumerable: false,
      writable: false,
      value: firebaseRefs
    },
    listeners: {
      enumerable: false,
      writable: false,
      value: firebaseListeners
    },
    initialized: {
      enumerable: false,
      writable: false,
      value: initialized
    }
  })
}
