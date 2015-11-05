import Firebase from 'firebase';
import isEqual from 'lodash/lang/isEqual';
import difference from 'lodash/array/difference';
import intersection from 'lodash/array/intersection';

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
  unauthenticateUser
} from './actions/firebase';

function dispatchChildAdded(store, localBinding) {
  return (snapshot, previousChildKey) => {
    return store.dispatch(
      addArrayChild(localBinding, snapshot, previousChildKey)
    );
  };
}

function dispatchChildChanged(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      changeArrayChild(localBinding, snapshot)
    );
  };
}

function dispatchChildMoved(store, localBinding) {
  return (snapshot, previousChildKey) => {
    return store.dispatch(
      moveArrayChild(localBinding, snapshot, previousChildKey)
    );
  };
}

function dispatchChildRemoved(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      removeArrayChild(localBinding, snapshot)
    );
  };
}

function dispatchArrayUpdated(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      updateArray(localBinding, snapshot)
    );
  };
}

function dispatchObjectUpdated(store, localBinding, snapshot) {
  return store.dispatch(
    updateObject(localBinding, snapshot)
  );
}

function dispatchInitialValueReceived(store, localBinding) {
  return store.dispatch(receiveInitialValue(localBinding));
}

function unsubscribe(localBinding, ref, listeners) {
  for (const event in listeners) {
    if (listeners.hasOwnProperty(event)) {
      ref.off(event, listeners[event]);
    }
  }
}

function unsubscribeAll(refs, listeners) {
  for (const localBinding in refs) {
    if (refs.hasOwnProperty(localBinding)) {
      unsubscribe(localBinding, refs[localBinding], listeners[localBinding]);
      delete refs[localBinding];
      delete listeners[localBinding];
    }
  }
}

function subscribe(localBinding, bindOptions, options) {
  const {path, type, initialQuery} = bindOptions;
  const {store, url, onCancel} = options;
  const firebaseRef = new Firebase(`${url}${path}`);
  let listeners = {};

  if (type === "Array") {
    const initialRef = initialQuery
      ? initialQuery(firebaseRef)
      : firebaseRef;

    // listen for value once to prevent multiple updates on initial items
    listeners.value = initialRef.once('value', (snapshot) => {
      dispatchInitialValueReceived(store, localBinding);
      dispatchArrayUpdated(store, localBinding)(snapshot);

      const snapshotKeys = Object.keys(snapshot.val() || {}).sort();
      const lastIdInSnapshot = snapshotKeys[snapshotKeys.length - 1]

      // only listen child_added for new items, don't dispatch for initial items
      if (lastIdInSnapshot) {
        listeners.child_added = firebaseRef
        .orderByKey()
        .startAt(lastIdInSnapshot)
        .on(
          'child_added',
          (snapshot, previousChildKey) => {
            if ( snapshot.key() !== lastIdInSnapshot ) {
              dispatchChildAdded(store, localBinding)(snapshot, previousChildKey);
            }
          },
          onCancel
        );
      }
      // Add listeners for rest of 'child_*' events
      listeners.child_changed = firebaseRef.on('child_changed', dispatchChildChanged(store, localBinding), onCancel);
      listeners.child_moved = firebaseRef.on('child_moved', dispatchChildMoved(store, localBinding), onCancel);
      listeners.child_removed = firebaseRef.on('child_removed', dispatchChildRemoved(store, localBinding), onCancel);
    }, onCancel);
  } else {
    // Add listener for 'value' event
    listeners = {
      value: firebaseRef.on('value', (snapshot) => {
        dispatchInitialValueReceived(store, localBinding);
        dispatchObjectUpdated(store, localBinding, snapshot);
      }, onCancel)
    };
  }

  return {
    ref: firebaseRef.ref(),
    listeners: listeners
  }
}

function createBindings(bindings, state) {
  return Object.keys(bindings).reduce((result, localBinding) => {
    const path = typeof bindings[localBinding].path === "function"
      ? bindings[localBinding].path(state)
      : bindings[localBinding].path;

    if (path) {
      result[localBinding] = {
        ...bindings[localBinding],
        path: path
      }
    }
    return result;
  }, {});
}

export default function syncFirebase(options = {}) {

  const {
    store,
    url,
    bindings: initialBindings = {},
    onCancel = () => {},
    onAuth
  } = options;

  if (typeof store === "undefined") {
    throw new Error("syncFirebase: Redux store reference not found in options");
  }

  if (typeof url === "undefined") {
    throw new Error("syncFirebase: Firebase url not found in options");
  }

  const rootRef = new Firebase(url);
  const firebaseRefs = {};
  const firebaseListeners = {};

  let currentBindings = createBindings(initialBindings, store.getState());
  store.subscribe(() => {
    const previousBindings = {...currentBindings};
    const nextBindings = createBindings(initialBindings, store.getState());
    if ( !isEqual(currentBindings, nextBindings) ) {
      const subscribed = difference(Object.keys(nextBindings), Object.keys(currentBindings));
      const unsubscribed = difference(Object.keys(currentBindings), Object.keys(nextBindings));
      const remaining = intersection(Object.keys(currentBindings), Object.keys(nextBindings));
      currentBindings = nextBindings;

      // unsubscribe removed bindings
      unsubscribed.forEach(localBinding => {
        unsubscribe(localBinding, firebaseRefs[localBinding], firebaseListeners[localBinding]);
        delete firebaseRefs[localBinding];
        delete firebaseListeners[localBinding];

        // reset store value to null
        store.dispatch(replaceValue(localBinding, null));
      });

      // subscribe new bindings
      subscribed.forEach(localBinding => {
        const {ref, listeners} = subscribe(
          localBinding,
          currentBindings[localBinding],
          {
            store: store,
            url: url,
            onCancel: onCancel
          }
        );
        firebaseRefs[localBinding] = ref;
        firebaseListeners[localBinding] = listeners;
      });

      // check if subscription paths have changed
      remaining.forEach(localBinding => {
        if (currentBindings[localBinding].path !== previousBindings[localBinding].path) {
          // unsubscribe
          unsubscribe(localBinding, firebaseRefs[localBinding], firebaseListeners[localBinding]);
          delete firebaseRefs[localBinding];
          delete firebaseListeners[localBinding];

          // resubscribe with new path
          const {ref, listeners} = subscribe(
            localBinding,
            currentBindings[localBinding],
            {
              store: store,
              url: url,
              onCancel: onCancel
            }
          );
          firebaseRefs[localBinding] = ref;
          firebaseListeners[localBinding] = listeners;
        }
      });

    }
  });

  rootRef.child('.info/connected')
  .on('value', snapshot => {
    if (snapshot.val() === true) {
      store.dispatch(connect());
    }
  });

  rootRef.onAuth(function(authData) {
    if (authData) {
      store.dispatch(authenticateUser(authData));
    } else {
      store.dispatch(unauthenticateUser());
    }
    if (onAuth && typeof onAuth === "function") {
      onAuth(authData);
    }
  });

  Object.keys(currentBindings).forEach(localBinding => {
    const {ref, listeners} = subscribe(
      localBinding,
      currentBindings[localBinding],
      {
        store: store,
        url: url,
        onCancel: onCancel
      }
    );
    firebaseRefs[localBinding] = ref;
    firebaseListeners[localBinding] = listeners;
  });

  // immediately mark initial fetch completed if we aren't initially subscribed to any stores
  if (!Object.keys(currentBindings).length) {
    store.dispatch(completeInitialFetch());
  }

  const initialized = new Promise((resolve, reject) => {
    const unsubscribe = store.subscribe(() => {
      const {firebase} = store.getState();
      if (firebase.connected && firebase.initialFetchDone) {
        resolve();
        unsubscribe();
      }
    });
  });

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
  });
}
