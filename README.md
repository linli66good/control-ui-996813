# control-ui (996813.xyz)

## Domains
- app: https://app.996813.xyz
- api: https://api.996813.xyz

## Secrets / Config
Set these in Cloudflare Pages (Production env):
- APP_PASSWORD=XXY960813
- COOKIE_SIGNING_SECRET=<random long string>
- API_BASE=https://api.996813.xyz
- API_SHARED_SECRET=<random long string>

Set these on the server for FastAPI service:
- API_SHARED_SECRET=<same as above>
- SHEET_ID=1T2CKdeRTC8y_mGT0cdKPskcqiHzhQvDW7uvFbPGeANU
- ALL_PROXY/HTTPS_PROXY/HTTP_PROXY=socks5h://127.0.0.1:1080
- GOG_ACCOUNT=lanyoujckyxgs@gmail.com
- GOG_KEYRING_PASSWORD=(from /etc/systemd/system/openclaw.service.d/gog.conf)

## Notes
- Google access requires proxy (DNS pollution). Use socks5h.
- Cloudflare Tunnel will expose api.996813.xyz -> http://127.0.0.1:8787
