import unsubscribe from './unsubscribe'

export default function unsubscribeAll(refs, listeners) {
  for (const localBinding in refs) {
    if (refs.hasOwnProperty(localBinding)) {
      unsubscribe(refs[localBinding], listeners[localBinding])
      delete refs[localBinding]
      delete listeners[localBinding]
    }
  }
}
