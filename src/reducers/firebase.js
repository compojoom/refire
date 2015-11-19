import findIndex from 'lodash/array/findIndex'
import createReducer from '../helpers/createReducer'
import {
  ARRAY_CHILD_ADDED,
  ARRAY_CHILD_CHANGED,
  ARRAY_CHILD_MOVED,
  ARRAY_CHILD_REMOVED,
  ARRAY_UPDATED,
  OBJECT_UPDATED,
  VALUE_REPLACED,
  INITIAL_VALUE_RECEIVED,
  INITIAL_FETCH_DONE,
  CONNECTED,
  USER_AUTHENTICATED,
  USER_UNAUTHENTICATED
} from '../actions/firebase'

function indexForKey(array, key) {
  return findIndex(array, element => element.key === key)
}

function arrayChildAdded(state, action) {
  const {payload: {path, key, value, previousChildKey}} = action
  const newArray = [...state.stores[path].value]
  const insertionIndex = previousChildKey === null
    ? 0
    : indexForKey(newArray, previousChildKey) + 1

  newArray.splice(insertionIndex, 0, value)

  return {
    ...state,
    stores: {
      ...state.stores,
      [path]: {
        ...state.stores[path],
        value: newArray
      }
    }
  }
}

function arrayChildChanged(state, action) {
  const {payload: {path, key, value}} = action
  const newArray = [...state.stores[path].value]
  newArray[indexForKey(newArray, key)] = value

  return {
    ...state,
    stores: {
      ...state.stores,
      [path]: {
        ...state.stores[path],
        value: newArray
      }
    }
  }
}

function arrayChildMoved(state, action) {
  const {payload: {path, key, previousChildKey}} = action
  const newArray = [...state.stores[path].value]
  const currentIndex = indexForKey(newArray, key)
  const record = newArray.splice(currentIndex, 1)[0]

  const insertionIndex = previousChildKey === null
    ? 0
    : indexForKey(newArray, previousChildKey) + 1

  newArray.splice(insertionIndex, 0, record)

  return {
    ...state,
    stores: {
      ...state.stores,
      [path]: {
        ...state.stores[path],
        value: newArray
      }
    }
  }
}

function arrayChildRemoved(state, action) {
  const {payload: {path, key}} = action
  const newArray = [...state.stores[path].value]
  newArray.splice(indexForKey(newArray, key), 1)

  return {
    ...state,
    stores: {
      ...state.stores,
      [path]: {
        ...state.stores[path],
        value: newArray
      }
    }
  }
}

function valueReplaced(state, action) {
  const {payload: {path, value}} = action
  return {
    ...state,
    stores: {
      ...state.stores,
      [path]: value
    }
  }
}

function initialValueReceived(state, action) {
  const {payload: {path}} = action
  return {
    ...state,
    initialValuesReceived: [...state.initialValuesReceived, path]
  }
}

function initialFetchDone(state, action) {
  return {
    ...state,
    initialFetchDone: true
  }
}

function connected(state, action) {
  return {
    ...state,
    connected: true
  }
}

function userAuthenticated(state, action) {
  return {
    ...state,
    authenticatedUser: action.payload
  }
}

function userUnauthenticated(state, action) {
  return {
    ...state,
    authenticatedUser: null
  }
}

export default function(bindings) {
  const initialStores = Object.keys(bindings).reduce((obj, path) => {
    obj[path] = null
    return obj
  }, {})

  const initialState = {
    authenticatedUser: null,
    connected: false,
    initialFetchDone: false,
    initialValuesReceived: [],
    stores: initialStores
  }

  return createReducer(initialState, {
    [ARRAY_CHILD_ADDED]: arrayChildAdded,
    [ARRAY_CHILD_CHANGED]: arrayChildChanged,
    [ARRAY_CHILD_MOVED]: arrayChildMoved,
    [ARRAY_CHILD_REMOVED]: arrayChildRemoved,
    [ARRAY_UPDATED]: valueReplaced,
    [OBJECT_UPDATED]: valueReplaced,
    [VALUE_REPLACED]: valueReplaced,
    [INITIAL_VALUE_RECEIVED]: initialValueReceived,
    [INITIAL_FETCH_DONE]: initialFetchDone,
    [CONNECTED]: connected,
    [USER_AUTHENTICATED]: userAuthenticated,
    [USER_UNAUTHENTICATED]: userUnauthenticated
  })
}
