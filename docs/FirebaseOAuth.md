# FirebaseOAuth

> Firebase OAuth login

Available providers are `facebook`, `google`, `twitter` and `github`.

Available authentication flows are `authWithOAuthPopup` and `authWithOAuthRedirect`.

```js
import { FirebaseOAuth } from 'refire-app'
const LoginWithGoogle = () => {
  return (
    <FirebaseOAuth provider="google" flow="authWithOAuthPopup">
      <Button>Login with Google</Button>
    </FirebaseOAuth>
  )
}
```
