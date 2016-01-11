export default function unsubscribe(ref, listeners) {
  for (const event in listeners) {
    if (listeners.hasOwnProperty(event)) {
      ref.off(event, listeners[event])
    }
  }
}
