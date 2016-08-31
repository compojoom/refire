import firebase from 'firebase'
import isEqual from 'lodash/lang/isEqual'
import difference from 'lodash/array/difference'
import intersection from 'lodash/array/intersection'

import {
  replaceValue,
  receiveInitialValue,
  completeInitialFetch,
  connect,
  authenticateUser,
  unauthenticateUser,
  updateConfig,
  revokePermissions
} from './actions/firebase'

import createOptions from './syncFirebase/createOptions'
import subscribe from './syncFirebase/subscribe'
import unsubscribe from './syncFirebase/unsubscribe'
import unsubscribeAll from './syncFirebase/unsubscribeAll'

export default function syncFirebase(options = {}) {

  const {
    apiKey,
    store,
    projectId,
    databaseURL,
    serviceAccount,
    name = '[DEFAULT]',
    bindings: initialBindings = {},
    onCancel = () => {},
    onAuth,
    pathParams
  } = options

  if (typeof store === "undefined") {
    throw new Error("syncFirebase: Redux store reference not found in options")
  }

  if (typeof projectId === "undefined") {
    throw new Error("syncFirebase: projectId not found in options")
  }

  if (typeof apiKey === "undefined") {
    throw new Error("syncFirebase: apiKey not found in options")
  }

  if (typeof url !== "undefined") {
    throw new Error("syncFirebase: url is deprecated in options, use projectId & apiKey instead")
  }

  const config = {
    apiKey: apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    databaseURL: databaseURL ? databaseURL : `https://${projectId}.firebaseio.com`,
    storageBucket: `${projectId}.appspot.com`,
  }

  if (serviceAccount) {
    config.serviceAccount = serviceAccount
  }

  store.dispatch(updateConfig({name: name}))

  const app = firebase.initializeApp(config, name)
  const rootRef = firebase.database(app).ref()
  const firebaseRefs = {}
  const firebaseListeners = {}
  const firebasePopulated = {}

  let currentOptions = createOptions({
    bindings: initialBindings,
    state: store.getState(),
    projectId,
    pathParams,
    appName: name
  })

  store.subscribe(() => {
    const previousOptions = {...currentOptions}
    const nextOptions = createOptions({
      bindings: initialBindings,
      state: store.getState(),
      projectId,
      pathParams,
      appName: name
    })

    if ( !isEqual(currentOptions, nextOptions) ) {

      const nextOptionsKeys = Object.keys(nextOptions)
      const currentOptionsKeys = Object.keys(currentOptions)

      const subscribed = difference(nextOptionsKeys, currentOptionsKeys)
      const unsubscribed = difference(currentOptionsKeys, nextOptionsKeys)
      const remaining = intersection(currentOptionsKeys, nextOptionsKeys)

      currentOptions = nextOptions

      // unsubscribe removed bindings
      unsubscribed.forEach(localBinding => {
        unsubscribe(
          firebaseRefs[localBinding],
          firebaseListeners[localBinding],
          firebasePopulated[localBinding]
        )
        delete firebaseRefs[localBinding]
        delete firebaseListeners[localBinding]
        delete firebasePopulated[localBinding]

        // reset store value to null
        store.dispatch(replaceValue(localBinding, null))
      })

      // subscribe new bindings
      subscribed.forEach(localBinding => {
        const {ref, listeners, populated} = subscribe(
          localBinding,
          currentOptions[localBinding],
          {
            store: store,
            onCancel: onCancel,
            name: name
          }
        )
        firebaseRefs[localBinding] = ref
        firebaseListeners[localBinding] = listeners
        firebasePopulated[localBinding] = populated
      })

      // check if subscription paths or queries have changed
      remaining.forEach(localBinding => {
        if (
          !isEqual(currentOptions[localBinding].path, previousOptions[localBinding].path) ||
          !isEqual(currentOptions[localBinding].queryState, previousOptions[localBinding].queryState)
        ) {
          // unsubscribe
          unsubscribe(
            firebaseRefs[localBinding],
            firebaseListeners[localBinding],
            firebasePopulated[localBinding]
          )
          delete firebaseRefs[localBinding]
          delete firebaseListeners[localBinding]
          delete firebasePopulated[localBinding]

          // resubscribe with new path / query
          const {ref, listeners, populated} = subscribe(
            localBinding,
            currentOptions[localBinding],
            {
              store: store,
              onCancel: onCancel,
              name: name
            }
          )
          firebaseRefs[localBinding] = ref
          firebaseListeners[localBinding] = listeners
          firebasePopulated[localBinding] = populated
        }
      })

    }
  })

  firebase.database(app).ref('.info/connected')
  .on('value', snapshot => {
    if (snapshot.val() === true) {
      store.dispatch(connect())
    }
  }, revokePermissions)


  // we need to check for existence of auth as node version doesn't include it
  if (firebase.auth(app) && typeof firebase.auth(app).onAuthStateChanged === "function") {
    firebase.auth(app).onAuthStateChanged(function(authData) {
      // TODO: decide proper user data format
      // current format is like this for backwards compatibility with 1.x
      const user = authData ? { ...authData.providerData[0], uid: authData.uid } : null
      if (user) {
        store.dispatch(authenticateUser(user))
      } else {
        store.dispatch(unauthenticateUser())
      }
      if (onAuth && typeof onAuth === "function") {
        onAuth(user, rootRef)
      }
    })
  }

  // initial subscriptions
  Object.keys(currentOptions).forEach(localBinding => {
    const {ref, listeners, populated} = subscribe(
      localBinding,
      currentOptions[localBinding],
      {
        store: store,
        onCancel: onCancel,
        name: name
      }
    )
    firebaseRefs[localBinding] = ref
    firebaseListeners[localBinding] = listeners
    firebasePopulated[localBinding] = populated
  })


  const initialized = new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const {firebase} = store.getState()
      if (firebase.connected && firebase.initialFetchDone) {
        resolve()
        unsubscribe()
      }
    })
  })

  // immediately mark initial fetch completed if we aren't initially subscribed to any stores
  if (!Object.keys(currentOptions).length) {
    store.dispatch(completeInitialFetch())
  }

  // mark initial values received for stores that don't have initial value
  difference(Object.keys(initialBindings), Object.keys(currentOptions)).forEach(localBinding => {
    store.dispatch(receiveInitialValue(localBinding))
  })

  return Object.defineProperties({
    unsubscribe: () => unsubscribeAll(firebaseRefs, firebaseListeners, firebasePopulated)
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
    populated: {
      enumerable: false,
      writable: false,
      value: firebasePopulated
    },
    initialized: {
      enumerable: false,
      writable: false,
      value: initialized
    }
  })
}
