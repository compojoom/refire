import React from 'react'
import createAll from './createAll'
export { default as syncFirebase } from './syncFirebase'
export { default as firebaseReducer } from './reducers/firebase'
export { default as firebaseActions } from './actions/firebase'
export { default as FirebaseLogin } from './components/FirebaseLogin'
export { default as FirebaseOAuth } from './components/FirebaseOAuth'
export { default as FirebaseRegistration } from './components/FirebaseRegistration'

import { connect } from 'react-redux'
export const { FirebaseProvider, connectFirebase } = createAll(React, connect)
