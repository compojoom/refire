import {
  dispatchChildAdded,
  dispatchChildChanged,
  dispatchChildMoved,
  dispatchChildRemoved,
  dispatchArrayUpdated,
  dispatchObjectUpdated,
  dispatchInitialValueReceived
} from './dispatch'

export default function subscribe(localBinding, bindOptions, options) {
  const {type, query, populate} = bindOptions
  const {store, onCancel} = options
  const listeners = {}

  if (type === "Array") {
    let initialValueReceived = false

    // TODO: should watch for populated value changes with .on('value'),
    // but better implement it elsewhere as subscribe returns only single ref?

    const populateChild = (key) => {
      return new Promise(resolve => {
        query.root().child(populate(key)).once('value', function(snapshot) {
          return resolve([key, snapshot.val()])
        }, function() {
          return resolve([key, null])
        })
      })
    }

    const onChildAdded = (snapshot, previousChildKey) => {
      if (initialValueReceived) {
        if (populate) {
          query.root().child(populate(snapshot.key())).once('value', function(populatedSnapshot) {
            dispatchChildAdded(store, localBinding)(snapshot.key(), populatedSnapshot.val(), previousChildKey)
          })
        } else {
          dispatchChildAdded(store, localBinding)(snapshot.key(), snapshot.val(), previousChildKey)
        }
      }
    }

    const onceValue = (snapshot) => {
      if (populate) {
        Promise.all(
          Object.keys(snapshot.val()).map(populateChild)
        ).then(resolved => {
          return resolved.reduce((result, arr) => {
            const [key, value] = arr
            result[key] = value
            return result
          }, {})
        }).then(populated => {
          dispatchArrayUpdated(store, localBinding)(snapshot.key(), populated)
          dispatchInitialValueReceived(store, localBinding)
          initialValueReceived = true
        })
      } else {
        dispatchArrayUpdated(store, localBinding)(snapshot.key(), snapshot.val())
        dispatchInitialValueReceived(store, localBinding)
        initialValueReceived = true
      }
    }

    // only listen child_added for new items after initial fetch is done
    listeners.child_added = query.on('child_added', onChildAdded, onCancel)

    // add listeners for rest of 'child_*' events
    listeners.child_changed = query.on('child_changed', dispatchChildChanged(store, localBinding), onCancel)
    listeners.child_moved = query.on('child_moved', dispatchChildMoved(store, localBinding), onCancel)
    listeners.child_removed = query.on('child_removed', dispatchChildRemoved(store, localBinding), onCancel)

    // listen for array value once to prevent multiple updates on initial items
    query.once('value', onceValue, onCancel)
  } else {
    listeners.value = query.on('value', (snapshot) => {
      dispatchObjectUpdated(store, localBinding, snapshot)
      dispatchInitialValueReceived(store, localBinding)
    }, onCancel)
  }

  return {
    ref: query.ref(),
    listeners: listeners
  }
}
