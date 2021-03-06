export default function unsubscribe(ref, listeners, populated) {
  Object.keys(listeners).forEach(event => {
    if (listeners.hasOwnProperty(event)) {
      ref.off(event, listeners[event])
    }
  })

  // cancel change listeners for populated refs
  Object.keys(populated).forEach(key => {
    populated[key].ref.off('value', populated[key].listener)
  })
}
