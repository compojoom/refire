// import firebase from 'firebase'
import RNFirebase from 'react-native-firebase';
let firebase = RNFirebase;
import buildQueryState from './buildQueryState'



export default function createOptions({bindings, pathParams, state, appName}) {
  return Object.keys(bindings).reduce((result, localBinding) => {

    const paramsState = typeof pathParams === "function"
      ? pathParams(state)
      : null

    const path = typeof bindings[localBinding].path === "function"
      ? bindings[localBinding].path(state, paramsState)
      : bindings[localBinding].path

    if (path) {
      const queryState = typeof bindings[localBinding].query === "function"
        ? bindings[localBinding].query(buildQueryState(), state).getState()
        : bindings[localBinding].query

      const firebaseRef = firebase.app(appName).database().ref(path)

      const query = bindings[localBinding].query
        ? bindings[localBinding].query(firebaseRef, state)
        : firebaseRef

      const type = bindings[localBinding].populate
        ? "Array"
        : bindings[localBinding].type

      result[localBinding] = {
        ...bindings[localBinding],
        path: path,
        query: query,
        queryState: queryState,
        type: type
      }
    }
    return result
  }, {})
}
