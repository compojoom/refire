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

    const onChildAdded = (snapshot, previousChildKey) => {
      if (initialValueReceived) {
        if (populate) {
          query.root().child(populate(snapshot.key())).once('value', function(populatedSnapshot) {
            dispatchChildAdded(store, localBinding)(snapshot.key(), populatedSnapshot.value(), previousChildKey)
          })
        } else {
          dispatchChildAdded(store, localBinding)(snapshot.key(), snapshot.value(), previousChildKey)
        }
      }
    }

    // only listen child_added for new items after initial fetch is done
    listeners.child_added = query.on('child_added', onChildAdded, onCancel)

    // add listeners for rest of 'child_*' events
    listeners.child_changed = query.on('child_changed', dispatchChildChanged(store, localBinding), onCancel)
    listeners.child_moved = query.on('child_moved', dispatchChildMoved(store, localBinding), onCancel)
    listeners.child_removed = query.on('child_removed', dispatchChildRemoved(store, localBinding), onCancel)

    // listen for array value once to prevent multiple updates on initial items
    listeners.value = query.once('value', (snapshot) => {
      dispatchInitialValueReceived(store, localBinding)
      dispatchArrayUpdated(store, localBinding)(snapshot)
      // TODO: if populate, go through array and dispatchArrayUpdated with values once all child have resolved with value
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
