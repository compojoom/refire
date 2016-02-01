import {
  addArrayChild,
  changeArrayChild,
  moveArrayChild,
  removeArrayChild,
  updateArray,
  updateObject,
  receiveInitialValue,
  revokePermissions
} from '../actions/firebase'

export function dispatchChildAdded(store, localBinding) {
  return (key, value, previousChildKey) => {
    return store.dispatch(
      addArrayChild(localBinding, key, value, previousChildKey)
    )
  }
}

export function dispatchChildChanged(store, localBinding) {
  return (key, value) => {
    return store.dispatch(
      changeArrayChild(localBinding, key, value)
    )
  }
}

export function dispatchChildMoved(store, localBinding) {
  return (snapshot, previousChildKey) => {
    return store.dispatch(
      moveArrayChild(localBinding, snapshot, previousChildKey)
    )
  }
}

export function dispatchChildRemoved(store, localBinding) {
  return (snapshot) => {
    return store.dispatch(
      removeArrayChild(localBinding, snapshot)
    )
  }
}

export function dispatchArrayUpdated(store, localBinding) {
  return (key, value) => {
    return store.dispatch(
      updateArray(localBinding, key, value)
    )
  }
}

export function dispatchObjectUpdated(store, localBinding, snapshot) {
  return store.dispatch(
    updateObject(localBinding, snapshot)
  )
}

export function dispatchInitialValueReceived(store, localBinding) {
  return store.dispatch(receiveInitialValue(localBinding))
}

export function dispatchPermissionsRevoked(store, error) {
  return store.dispatch(revokePermissions(error))
}
