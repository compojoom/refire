export default function buildQueryState() {
  let state = {}
  return {
    orderByChild(order) {
      state = { ...state, orderByChild: order }
      return this
    },
    orderByKey(order) {
      state = { ...state, orderByKey: order }
      return this
    },
    orderByValue(order) {
      state = { ...state, orderByValue: order }
      return this
    },
    orderByPriority(order) {
      state = { ...state, orderByPriority: order }
      return this
    },
    startAt(start) {
      state = { ...state, startAt: start }
      return this
    },
    endAt(end) {
      state = { ...state, endAt: end }
      return this
    },
    equalTo(equalTo) {
      state = { ...state, equalTo: equalTo }
      return this
    },
    limitToFirst(limit) {
      state = { ...state, limitToFirst: limit }
      return this
    },
    limitToLast(limit) {
      state = { ...state, limitToLast: limit }
      return this
    },
    getState() {
      return state
    }
  }
}
