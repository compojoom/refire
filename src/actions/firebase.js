import firebase from 'firebase'
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
export const WRITE_PROCESSING_UPDATED = "WRITE_PROCESSING_UPDATED"
export const WRITE_ERRORS_UPDATED = "WRITE_ERRORS_UPDATED"

const authProviders = {
  facebook: "FacebookAuthProvider",
  github: "GithubAuthProvider",
  google: "GoogleAuthProvider",
  twitter: "TwitterAuthProvider",
}

const authFlows = {
  popup: "signInWithPopup",
  redirect: "signInWithRedirect",
}

// generated UUIDs are only used for internal request tracking
// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(char) {
    const rand = Math.random()*16|0
    const value = char === 'x'
      ? rand
      : (rand&0x3|0x8)
    return value.toString(16)
  })
}

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

function updateWriteProcessing(options = {}) {
  const {path, id, value} = options
  return {
    type: WRITE_PROCESSING_UPDATED,
    payload: {
      path: path,
      id: id,
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

function updateWriteErrors(path, error) {
  return {
    type: WRITE_ERRORS_UPDATED,
    payload: {
      path: path,
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

export function addArrayChild(path, key, value, previousChildKey) {
  return {
    type: ARRAY_CHILD_ADDED,
    payload: {
      path: path,
      key: key,
      value: createRecord(key, value),
      previousChildKey: previousChildKey
    }
  }
}

export function changeArrayChild(path, key, value) {
  return {
    type: ARRAY_CHILD_CHANGED,
    payload: {
      path: path,
      key: key,
      value: createRecord(key, value)
    }
  }
}

export function moveArrayChild(path, snapshot, previousChildKey) {
  return {
    type: ARRAY_CHILD_MOVED,
    payload: {
      path: path,
      key: snapshot.key,
      previousChildKey: previousChildKey
    }
  }
}

export function removeArrayChild(path, snapshot) {
  return {
    type: ARRAY_CHILD_REMOVED,
    payload: {
      path: path,
      key: snapshot.key
    }
  }
}

export function updateArray(path, key, value) {
  const recordsArray = (value || []).reduce((arr, record) => {
    arr.push(
      createRecord(record[0], record[1])
    )
    return arr
  }, [])

  return {
    type: ARRAY_UPDATED,
    payload: {
      path: path,
      value: createRecord(key, recordsArray)
    }
  }
}

export function updateObject(path, snapshot) {
  return {
    type: OBJECT_UPDATED,
    payload: {
      path: path,
      value: createRecord(snapshot.key, snapshot.val())
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
        uniq(initialValuesReceived).length === Object.keys(stores).length
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

      const {firebase: {name}} = getState()

      firebase.app(name).auth().signInWithEmailAndPassword(email, password).then(() => {
        dispatch(updateProcessing("login", false))
        dispatch(updateCompleted("login", true))
        return resolve()
      }).catch(error => {
        dispatch(updateError("login", error.message))
        dispatch(updateProcessing("login", false))
        return reject()
      })
    })
  }
}

export function oAuthLogin(flowCode, providerCode, scopes = []) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch(updateProcessing("login", true))

      const provider = new firebase.auth[authProviders[providerCode]]()
      scopes.forEach(scope => {
        provider.addScope(scope)
      })
      const flow = authFlows[flowCode]
      const {firebase: {name}} = getState()
      firebase.app(name).auth()[flow](provider).then(() => {
        dispatch(updateProcessing("login", false))
        dispatch(updateCompleted("login", true))
        return resolve()
      }).catch(error => {
        dispatch(updateError("login", error.message))
        dispatch(updateProcessing("login", false))
        return reject()
      })
    })
  }
}

export function logout() {
  return () => {
    firebase.auth().signOut()
  }
}

export function createUser(email, password) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch(updateProcessing("createUser", true))

      const {firebase: {name}} = getState()

      firebase.app(name).auth().createUserWithEmailAndPassword(email, password).then(userData => {
        dispatch(updateProcessing("createUser", false))
        dispatch(updateCompleted("createUser", true))
        return resolve(userData)
      }).catch(error => {
        dispatch(
          updateError(
            "createUser",
            createUserErrors[error.code] || error.message
          )
        )
        dispatch(updateProcessing("createUser", false))
        return reject()
      })
    })
  }
}

export function resetPassword(email) {
  return (dispatch, getState) => {
    dispatch(updateProcessing("resetPassword", true))

    const {firebase: {name}} = getState()

    firebase.app(name).auth().sendPasswordResetEmail(email).then(() => {
      dispatch(updateProcessing("resetPassword", false))
      dispatch(updateCompleted("resetPassword", true))
    }).catch(error => {
      dispatch(
        updateError(
          "resetPassword",
          resetPasswordErrors[error.code] || error.message
        )
      )
      dispatch(updateProcessing("resetPassword", false))
    })
  }
}

export function write({ method, path = "", value, ownProps }) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {

      const id = createUUID()
      const finalPath = typeof path === "function"
        ? path(getState(), ownProps)
        : (path ? path : "/")
      const {firebase: {name}} = getState()

      dispatch(
        updateWriteProcessing({
          path: finalPath,
          id: id,
          value: true
        })
      )

      const ref = firebase.app(name).database().ref(finalPath)
      ref[method](
        value,
        error => {
          if (error) {
            dispatch(
              updateWriteErrors(finalPath, error.message)
            )
            return reject()
          }
          dispatch(
            updateWriteProcessing({
              path: finalPath,
              id: id,
              value: false
            })
          )
          return resolve()
        }
      )
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

export function clearWriteErrors(path) {
  return updateWriteErrors(path, null)
}

export function revokePermissions(error) {
  return updateError("permissions", error.toString())
}

export function clearPermissionsError() {
  return updateError("permissions", null)
}
