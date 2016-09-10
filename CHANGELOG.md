# 2.0.0

## New features

- `syncFirebase` now accepts `databaseURL`, `serviceAccount` and `name` as params. You can now have multiple Refire instances to different Firebase databases in a single app.

## Other notes

- Test are now back to green, thanks to the upgraded firebase-server.

# 2.0.0-beta1

## Breaking changes

### Core
- Upgraded to Firebase API v3
- Refire now exports `firebase` instead of `Firebase`
- `syncFirebase` params changed, delete `url` and add `apiKey` and `projectId` as shown in README.md

### FirebaseOAuth

- Replace `authWithOAuthPopup` with `popup` and `authWithOAuthRedirect` with `redirect` in `flow` prop

## New features

- FirebaseOAuth now supports `scopes` prop for requesting additional user information during OAuth login

## Other notes

- Tests are still broken as firebase-server doesn't support Firebase API v3, track [this issue](https://github.com/urish/firebase-server/pull/51) for progress report
