import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import hoistStatics from 'hoist-non-react-statics';

export default function connectFirebase(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  options
) {

  const firebaseStateToProps = (state, localBindings) => {
    return localBindings.reduce((stateSlice, binding) => {
      if (binding === "_status") {
        const {authenticatedUser, connected, initialFetchDone} = state.firebase;
        stateSlice[binding] = {authenticatedUser, connected, initialFetchDone};
      } else {
        stateSlice[binding] = state.firebase.stores[binding];
      }
      return stateSlice;
    }, {});
  }

  const combinedStateToProps = (state, ownProps) => {
    const mappedState = typeof mapStateToProps === "function"
      ? mapStateToProps(state, ownProps)
      : {firebase: []};

    const {firebase, ...otherState} = mappedState;
    const firebaseState = firebaseStateToProps(state, firebase);

    return {
      ...otherState,
      ...firebaseState
    };
  }

  return function(WrappedComponent) {
    class ConnectFirebase extends Component {
      render() {
        return <WrappedComponent {...this.props} firebase={this.context.firebase} />;
      }
    }

    ConnectFirebase.contextTypes = {firebase: PropTypes.object};
    ConnectFirebase.displayName = `ConnectFirebase(${WrappedComponent.displayName || WrappedComponent.name || 'Component'}`;

    return connect(
      combinedStateToProps,
      mapDispatchToProps,
      mergeProps,
      options
    )(
      hoistStatics(ConnectFirebase, WrappedComponent)
    );
  }

}
