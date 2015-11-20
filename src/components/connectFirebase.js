import hoistStatics from 'hoist-non-react-statics'

export default function createConnect(React, connect) {
  const { Component, PropTypes } = React

  return function connectFirebase(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    options = {}
  ) {
    const { withRef = false } = options

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

    const combinedStateToProps = (state, ownProps) => {
      const mappedState = typeof mapStateToProps === "function"
        ? mapStateToProps(state, ownProps)
        : {firebase: []}

      const {firebase, ...otherState} = mappedState
      const firebaseState = firebaseStateToProps(state, firebase)

      return {
        ...otherState,
        ...firebaseState
      }
    }

    return function(WrappedComponent) {
      class ConnectFirebase extends Component {

        constructor(props, context) {
          super(props, context)
          this.store = props.store || context.store
          if (!this.store) {
            throw new Error(
              `Invariant Violation: Could not find "store" in either the context or ` +
              `props of "${this.constructor.displayName}". ` +
              `Either wrap the root component in a <Provider>, ` +
              `or explicitly pass "store" as a prop to "${this.constructor.displayName}".`
            )
          }
        }

        getWrappedInstance() {
          return this.refs.wrappedInstance
        }

        render() {
          const ref = withRef ? 'wrappedInstance' : null
          return (
            <WrappedComponent
              {...this.props}
              firebase={this.context.firebase}
              ref={ref} />
          )
        }
      }

      ConnectFirebase.displayName = `ConnectFirebase(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`
      ConnectFirebase.WrappedComponent = WrappedComponent
      ConnectFirebase.contextTypes = {
        firebase: PropTypes.object,
        store: PropTypes.object
      }
      ConnectFirebase.propTypes = {
        firebase: PropTypes.object,
        store: PropTypes.object
      }

      const mapState = mapStateToProps && mapStateToProps.length
        ? combinedStateToProps
        : mapStateToProps

      return connect(
        mapState,
        mapDispatchToProps,
        mergeProps,
        options
      )(
        hoistStatics(ConnectFirebase, WrappedComponent)
      )
    }

  }
}
