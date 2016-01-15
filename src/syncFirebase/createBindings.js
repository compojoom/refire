import Firebase from 'firebase'
import buildQueryState from './buildQueryState'

export default function createBindings(bindings, state, url) {
  return Object.keys(bindings).reduce((result, localBinding) => {

    const path = typeof bindings[localBinding].path === "function"
      ? bindings[localBinding].path(state)
      : bindings[localBinding].path

    if (path) {
      const queryState = typeof bindings[localBinding].query === "function"
        ? bindings[localBinding].query(buildQueryState(), state).getState()
        : bindings[localBinding].query

      const firebaseRef = new Firebase(`${url}${path}`)

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
