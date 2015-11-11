import React from 'react';
import createAll from './createAll';
export { default as syncFirebase } from './syncFirebase';
export { default as firebaseReducer } from './reducers/firebase';

import { connect } from 'react-redux';
export const { FirebaseProvider, connectFirebase } = createAll(React, connect);
