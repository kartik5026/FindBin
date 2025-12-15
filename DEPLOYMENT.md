## Deploy FindBin

### Backend (Render)

- **Repo**: connect your GitHub repo
- **Blueprint**: Render will detect `render.yaml`
- **Root directory**: `server`
- **Build**: `npm install && npm run build`
- **Start**: `npm start`

Set Render environment variables:
- `MONGODB_URI`
- `secret_key`

After deploy, copy the Render URL, e.g. `https://findbin-api.onrender.com`

### Frontend (Vercel)

- **Root directory**: `client`
- **Framework**: Vite

Set Vercel environment variable:
- `VITE_API_BASE_URL` = your Render URL (example: `https://findbin-api.onrender.com`)

Redeploy after setting env vars.


