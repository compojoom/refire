import unsubscribe from './unsubscribe'

export default function unsubscribeAll(refs, listeners, populated) {
  Object.keys(refs).forEach(localBinding => {
    if (refs.hasOwnProperty(localBinding)) {
      unsubscribe(refs[localBinding], listeners[localBinding], populated[localBinding])
      delete refs[localBinding]
      delete listeners[localBinding]
      delete populated[localBinding]
    }
  })
}
