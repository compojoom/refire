import createProvider from './components/FirebaseProvider'
import createConnect from './components/connectFirebase'

export default function createAll(React, connect) {
  const FirebaseProvider = createProvider(React)
  const connectFirebase = createConnect(React, connect)
  return { FirebaseProvider, connectFirebase }
}
