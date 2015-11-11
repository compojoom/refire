import createProvider from './components/FirebaseProvider';
import createConnect from './components/connectFirebase';

export default function createAll(React) {
  console.log("REXCT", React);
  const FirebaseProvider = createProvider(React);
  const connectFirebase = createConnect(React);
  return { FirebaseProvider, connectFirebase };
}
