const firebaseStateToProps = (state, localBindings) => {
  return (localBindings || []).reduce((stateSlice, binding) => {
    if (binding === "_status") {
      const { initialValuesReceived, stores, url, ...slice} = state.firebase
      stateSlice[binding] = slice
    } else {
      stateSlice[binding] = state.firebase.stores[binding]
    }
    return stateSlice
  }, {})
}

export default (firebaseBindings, mapStateToProps) => {
  return (state, ownProps) => {
    const firebaseState = firebaseStateToProps(state, firebaseBindings)
    const mappedState = typeof mapStateToProps === "function"
      ? mapStateToProps(state, ownProps)
      : {}
    return {
      ...mappedState,
      ...firebaseState
    }
  }
}
