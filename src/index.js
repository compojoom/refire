import React from 'react'
import createAll from './createAll'
export { default as syncFirebase } from './syncFirebase'
export { default as firebaseReducer } from './reducers/firebase'
export { default as FirebaseLogin } from './components/FirebaseLogin'
export { default as FirebaseOAuth } from './components/FirebaseOAuth'

import { connect } from 'react-redux'
export const { FirebaseProvider, connectFirebase } = createAll(React, connect)
