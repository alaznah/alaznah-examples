# Alaznah Examples

**Status:** Public · sample apps only

Reference React Native apps for **Alaznah Calling**. Clone this repo to try 1:1 audio/video against Alaznah Cloud.

These apps are **examples** — not published packages. Keep them on GitHub; consume the SDK from npm (`@alaznah/calling`) in real products.

## Apps


| Folder        | Focus                                        |
| ------------- | -------------------------------------------- |
| `basic-call/` | Primary 1:1 audio/video demo (iOS + Android) |
| `video-chat/` | Lightweight video-oriented scaffold          |
| `group-call/` | Reserved for future group demos              |


See each app’s `package.json` for its local package name.

## Prerequisites

- Node 18+
- Xcode / Android Studio as needed
- [`@alaznah/calling`](https://www.npmjs.com/package/@alaznah/calling) from npm (`npm install @alaznah/calling`)
- Short-lived calling tokens from [console.alaznah.com](https://console.alaznah.com) (or your own mint API)
- Signaling URL: `wss://signal.alaznah.com`



## Quick start (`basic-call`)

```bash
cd basic-call
npm install
# set signalingUrl + getAuthToken in the app entry

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

Do **not** commit push certificates, service-account JSON, or production API keys. Use gitignored env / CI secrets.

## Checklist

- [ ] `signalingUrl` → `wss://signal.alaznah.com`
- [ ] Fresh token from your backend / console mint API
- [ ] Same `userId` space on both test devices
- [ ] Physical devices for background / kill-state call tests



## Links


| Resource | URL |
| --- | --- |
| Docs | [docs.alaznah.com](https://docs.alaznah.com) |
| Console | [console.alaznah.com](https://console.alaznah.com) |
| SDK | [alaznah/alaznah-sdk](https://github.com/alaznah/alaznah-sdk) |
| Protocol | [alaznah/alaznah-protocol](https://github.com/alaznah/alaznah-protocol) |
| Signaling (private) | [alaznah/alaznah-signaling](https://github.com/alaznah/alaznah-signaling) |




## License

MIT for sample code unless a subdirectory says otherwise. Alaznah trademarks remain Alaznah’s.