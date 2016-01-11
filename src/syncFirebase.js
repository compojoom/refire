import Firebase from 'firebase'
import isEqual from 'lodash/lang/isEqual'
import difference from 'lodash/array/difference'
import intersection from 'lodash/array/intersection'

import {
  replaceValue,
  completeInitialFetch,
  connect,
  authenticateUser,
  unauthenticateUser,
  updateConfig
} from './actions/firebase'

import createBindings from './syncFirebase/createBindings'
import subscribe from './syncFirebase/subscribe'
import unsubscribe from './syncFirebase/unsubscribe'
import unsubscribeAll from './syncFirebase/unsubscribeAll'

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
        unsubscribe(firebaseRefs[localBinding], firebaseListeners[localBinding])
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
          unsubscribe(firebaseRefs[localBinding], firebaseListeners[localBinding])
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

  // initial subscriptions
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
