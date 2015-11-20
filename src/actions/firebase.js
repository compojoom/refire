import Firebase from 'firebase'
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
export const CONFIG_UPDATED = "CONFIG_UPDATED"
export const ERROR_UPDATED = "ERROR_UPDATED"
export const PROCESSING_UPDATED = "PROCESSING_UPDATED"
export const COMPLETED_UPDATED = "COMPLETED_UPDATED"

const createUserErrors = {
  "EMAIL_TAKEN": "The new user account cannot be created because the email is already in use.",
  "INVALID_EMAIL": "The specified email is not a valid email."
}

const resetPasswordErrors = {
  "INVALID_USER": "The specified user account does not exist."
}

function createRecord(key, value) {
  return {
    key: key,
    value: value
  }
}

function updateProcessing(field, value) {
  return {
    type: PROCESSING_UPDATED,
    payload: {
      field: field,
      value: value
    }
  }
}

function updateError(field, error) {
  return {
    type: ERROR_UPDATED,
    payload: {
      field: field,
      error: error
    }
  }
}

function updateCompleted(field, value) {
  return {
    type: COMPLETED_UPDATED,
    payload: {
      field: field,
      value: value
    }
  }
}

export function updateConfig(options) {
  return {
    type: CONFIG_UPDATED,
    payload: options
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

export function passwordLogin(email, password) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch(updateProcessing("login", true))
      const url = getState().firebase.url
      const ref = new Firebase(url)
      ref.authWithPassword(
        { email: email, password: password },
        (error) => {
          if (error) {
            dispatch(updateError("login", error.message))
            dispatch(updateProcessing("login", false))
            return reject()
          } else {
            dispatch(updateProcessing("login", false))
            dispatch(updateCompleted("login", true))
            return resolve()
          }
          // authentication state changes are handled in syncFirebase.js
        }
      )
    })
  }
}

export function oAuthLogin(flow, provider) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch(updateProcessing("login", true))

      const url = getState().firebase.url
      const ref = new Firebase(url)
      ref[flow](
        provider,
        (error) => {
          if (error) {
            dispatch(updateError("login", error.message))
            dispatch(updateProcessing("login", false))
            return reject()
          } else {
            dispatch(updateProcessing("createUser", false))
            dispatch(updateCompleted("login", true))
            return resolve()
          }
          // authentication state changes are handled in syncFirebase.js
        }
      )
    })
  }
}

export function createUser(email, password) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch(updateProcessing("createUser", true))

      const url = getState().firebase.url
      const ref = new Firebase(url)
      ref.createUser({
        email: email,
        password: password
      }, (error) => {
        if (error) {
          dispatch(
            updateError(
              "createUser",
              createUserErrors[error.code] || error.message
            )
          )
          dispatch(updateProcessing("createUser", false))
          return reject()
        } else {
          dispatch(updateProcessing("createUser", false))
          dispatch(updateCompleted("createUser", true))
          return resolve()
        }
      })
    })
  }
}

export function resetPassword(email) {
  return (dispatch, getState) => {
    dispatch(updateProcessing("resetPassword", true))

    const url = getState().firebase.url
    const ref = new Firebase(url)
    ref.resetPassword({
      email: email
    }, (error) => {
      if (error) {
        dispatch(
          updateError(
            "resetPassword",
            resetPasswordErrors[error.code] || error.message
          )
        )
        dispatch(updateProcessing("resetPassword", false))
      } else {
        dispatch(updateProcessing("resetPassword", false))
        dispatch(updateCompleted("resetPassword", true))
      }
    })
  }
}

export function clearLoginError() {
  return updateError("login", null)
}

export function clearRegistrationError() {
  return updateError("createUser", null)
}

export function clearResetPasswordError() {
  return updateError("resetPassword", null)
}
