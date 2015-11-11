import React from 'react-native';
import createAll from './createAll';
export { default as syncFirebase } from './syncFirebase';
export { default as firebaseReducer } from './reducers/firebase';
export const { FirebaseProvider, connectFirebase } = createAll(React);
