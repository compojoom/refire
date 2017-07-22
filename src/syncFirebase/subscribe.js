// import firebase from 'firebase'
import RNFirebase from 'react-native-firebase';
let firebase = RNFirebase;
import {
  dispatchChildAdded,
  dispatchChildChanged,
  dispatchChildMoved,
  dispatchChildRemoved,
  dispatchArrayUpdated,
  dispatchObjectUpdated,
  dispatchInitialValueReceived,
  dispatchPermissionsRevoked
} from './dispatch'

export default function subscribe(localBinding, bindOptions, options) {
  const { type, query, populate } = bindOptions
  const { store, onCancel, name } = options
  const listeners = {}
  const populated = {}

  const cancelCallback = (err) => {
    dispatchPermissionsRevoked(store, err)
    onCancel(err)
  }

  if (type === "Array") {
    let initialValueReceived = false

    const populateChild = (key) => {
      return new Promise(resolve => {
        const ref = firebase.app(name).database().ref(populate(key))
        ref.once('value', (snapshot) => {
          return resolve([key, ref, snapshot.val()])
        }, (err) => {
          cancelCallback(err)
          return resolve([key, ref, null])
        })
      })
    }

    // only listen child_added for arrays after initial fetch is done
    const onChildAdded = (snapshot, previousChildKey) => {
      if (initialValueReceived) {
        if (populate) {
          const ref = firebase.app(name).database().ref(populate(snapshot.key))
          ref.once('value', (populatedSnapshot) => {
            dispatchChildAdded(store, localBinding)(snapshot.key, populatedSnapshot.val(), previousChildKey)
            populated[snapshot.key] = {
              ref: ref,
              listener: ref.on('value', (populatedSnapshot) => {
                dispatchChildChanged(store, localBinding)(snapshot.key, populatedSnapshot.val())
              }, cancelCallback)
            }
          }, cancelCallback)
        } else {
          dispatchChildAdded(store, localBinding)(snapshot.key, snapshot.val(), previousChildKey)
        }
      }
    }

    const onceValue = (snapshot) => {
      if (populate) {
        const populateRefs = {}
        Promise.all(
          Object.keys(snapshot.val() || {}).map(populateChild)
        ).then(resolved => {
          const result = []
          resolved.forEach(arr => {
            const [key, ref, value] = arr
            result.push([key, value])
            populateRefs[key] = ref
          })
          return result
        }).then(populatedResult => {
          dispatchArrayUpdated(store, localBinding)(snapshot.key, populatedResult)
          dispatchInitialValueReceived(store, localBinding)
          initialValueReceived = true
          Object.keys(populateRefs).forEach(key => {
            const ref = populateRefs[key]
            populated[key] = {
              ref: ref,
              listener: ref.on('value', (populatedSnapshot) => {
                dispatchChildChanged(store, localBinding)(key, populatedSnapshot.val())
              }, cancelCallback)
            }
          })
        })
      } else {
        const orderedValue = []
        snapshot.forEach(child => {
          orderedValue.push([child.key, child.val()])
        })
        dispatchArrayUpdated(store, localBinding)(snapshot.key, orderedValue)
        dispatchInitialValueReceived(store, localBinding)
        initialValueReceived = true
      }
    }

    const onChildChanged = (snapshot) => {
      dispatchChildChanged(store, localBinding)(snapshot.key, snapshot.val())
    }

    const onChildRemoved = (snapshot) => {
      dispatchChildRemoved(store, localBinding)(snapshot)
      const key = snapshot.key
      if (populated[key]) {
        populated[key].ref.off('value', populated[key].listener)
        delete populated[key]
      }
    }

    listeners.child_added = query.on('child_added', onChildAdded, cancelCallback)
    listeners.child_changed = query.on('child_changed', onChildChanged, cancelCallback)
    listeners.child_moved = query.on('child_moved', dispatchChildMoved(store, localBinding), cancelCallback)
    listeners.child_removed = query.on('child_removed', onChildRemoved, cancelCallback)

    // listen for array value once to prevent multiple updates on initial items
    listeners.value = query.on('value', onceValue, (err) => {
      query.off('value', listeners.value)
      dispatchInitialValueReceived(store, localBinding)
      cancelCallback(err)
    })
  } else {
    listeners.value = query.on('value', (snapshot) => {
      dispatchObjectUpdated(store, localBinding, snapshot)
      dispatchInitialValueReceived(store, localBinding)
    }, (err) => {
      dispatchInitialValueReceived(store, localBinding)
      cancelCallback(err)
    })
  }

  return {
    ref: query.ref,
    listeners: listeners,
    populated: populated
  }
}
