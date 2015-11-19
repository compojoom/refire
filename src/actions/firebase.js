import difference from 'lodash/array/difference'
import uniq from 'lodash/array/uniq'

export const ARRAY_CHILD_ADDED = "ARRAY_CHILD_ADDED"
export const ARRAY_CHILD_CHANGED = "ARRAY_CHILD_CHANGED"
export const ARRAY_CHILD_MOVED = "ARRAY_CHILD_MOVED"
export const ARRAY_CHILD_REMOVED = "ARRAY_CHILD_REMOVED"
export const ARRAY_UPDATED = "ARRAY_UPDATED"
export const OBJECT_UPDATED = "OBJECT_UPDATED"
export const VALUE_REPLACED = "VALUE_REPLACED"
export const INITIAL_VALUE_RECEIVED = "INITIAL_VALUE_RECEIVED"
export const INITIAL_FETCH_DONE = "INITIAL_FETCH_DONE"
export const CONNECTED = "CONNECTED"
export const USER_AUTHENTICATED = "USER_AUTHENTICATED"
export const USER_UNAUTHENTICATED = "USER_UNAUTHENTICATED"

function createRecord(key, value) {
  return {
    key: key,
    value: value
  }
}

export function addArrayChild(path, snapshot, previousChildKey) {
  return {
    type: ARRAY_CHILD_ADDED,
    payload: {
      path: path,
      key: snapshot.key(),
      value: createRecord(snapshot.key(), snapshot.val()),
      previousChildKey: previousChildKey
    }
  }
}

export function changeArrayChild(path, snapshot) {
  return {
    type: ARRAY_CHILD_CHANGED,
    payload: {
      path: path,
      key: snapshot.key(),
      value: createRecord(snapshot.key(), snapshot.val())
    }
  }
}

export function moveArrayChild(path, snapshot, previousChildKey) {
  return {
    type: ARRAY_CHILD_MOVED,
    payload: {
      path: path,
      key: snapshot.key(),
      previousChildKey: previousChildKey
    }
  }
}

export function removeArrayChild(path, snapshot) {
  return {
    type: ARRAY_CHILD_REMOVED,
    payload: {
      path: path,
      key: snapshot.key()
    }
  }
}

export function updateArray(path, snapshot) {
  const snapshotValue = snapshot.val()
  const recordsArray = Object.keys(snapshotValue || []).reduce((arr, key) => {
    arr.push(
      createRecord(key, snapshotValue[key])
    )
    return arr
  }, [])

  return {
    type: ARRAY_UPDATED,
    payload: {
      path: path,
      value: createRecord(snapshot.key(), recordsArray)
    }
  }
}

export function updateObject(path, snapshot) {
  return {
    type: OBJECT_UPDATED,
    payload: {
      path: path,
      value: createRecord(snapshot.key(), snapshot.val())
    }
  }
}

export function replaceValue(path, value) {
  return {
    type: VALUE_REPLACED,
    payload: {
      path: path,
      value: value
    }
  }
}

export function completeInitialFetch() {
  return {
    type: INITIAL_FETCH_DONE
  }
}

export function receiveInitialValue(path) {
  return (dispatch, getState) => {
    const {firebase: {initialFetchDone}} = getState()
    if (!initialFetchDone) {

      dispatch({
        type: INITIAL_VALUE_RECEIVED,
        payload: {
          path: path
        }
      })

      const {firebase: {initialValuesReceived, stores}} = getState()

      if (
        !difference(
          uniq(initialValuesReceived),
          Object.keys(stores)
        ).length
      ) {
        dispatch(completeInitialFetch())
      }

    }
  }
}

export function connect() {
  return {type: CONNECTED}
}

export function authenticateUser(authData) {
  return {
    type: USER_AUTHENTICATED,
    payload: authData
  }
}

export function unauthenticateUser() {
  return {
    type: USER_UNAUTHENTICATED
  }
}
