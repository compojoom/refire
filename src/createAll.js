import createProvider from './components/FirebaseProvider'

export default function createAll(React) {
  const FirebaseProvider = createProvider(React)
  return { FirebaseProvider }
}
