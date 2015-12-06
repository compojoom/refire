import React from 'react'
import createAll from './createAll'

export { default as syncFirebase } from './syncFirebase'
export { default as firebaseToProps } from './firebaseToProps'
export { default as firebaseReducer } from './reducers/firebase'
export { default as firebaseActions } from './actions/firebase'
export { default as FirebaseLogin } from './components/FirebaseLogin'
export { default as FirebaseOAuth } from './components/FirebaseOAuth'
export { default as FirebaseRegistration } from './components/FirebaseRegistration'
export { default as FirebaseResetPassword } from './components/FirebaseResetPassword'
export { default as FirebaseWrite } from './components/FirebaseWrite'

export const { FirebaseProvider } = createAll(React)

export Firebase from 'firebase'
