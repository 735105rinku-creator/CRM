# cPanel Deployment

## Backend API upload: api.opasbizz.co.in

Upload the backend Node app from `backend/server` to the cPanel Node.js application folder for `https://api.opasbizz.co.in`.

Use these cPanel Node.js settings:
- Application startup file: `src/index.js`
- Application mode: `production`
- Node.js version: 18 or newer
- Startup command: `npm start`

Do not upload local `node_modules`. On cPanel run:

```bash
npm install --omit=dev
```

Create/update the live `.env` from `.env.cpanel.example`. Keep these production values:

```env
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://CRM:YOUR_MONGODB_PASSWORD@cluster0.sbrs6mi.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0
DB_CONNECT_TIMEOUT_MS=30000
CLIENT_ORIGIN=https://opasbizz.co.in
CLIENT_ORIGINS=http://127.0.0.1:4200,http://localhost:4200,https://opasbizz.co.in,https://www.opasbizz.co.in,https://opasbizz.in,https://www.opasbizz.in
API_PUBLIC_URL=https://api.opasbizz.co.in
COOKIE_SECURE=true
```

Use the existing live JWT secrets if the app is already live. Changing JWT secrets logs out existing users.

After upload, restart the Node.js app from cPanel.

Backend checks:
- Open `https://api.opasbizz.co.in/`
- Expected JSON contains `OPAS CRM Backend Running`
- Test login from `https://opasbizz.co.in` and local `http://localhost:4200`

## Frontend upload: opasbizz.co.in / opasbizz.in

The frontend runtime config is `frontend/crm-frontend/public/app-config.js`.
It automatically uses:
- `http://localhost:8080` on localhost
- `https://api.opasbizz.co.in` on live domains

Build frontend:

```bash
cd frontend/crm-frontend
npm run build
```

Upload all files from:

```txt
frontend/crm-frontend/dist/crm-frontend/browser
```

to the cPanel frontend document root, usually `public_html`.

Make sure these files are uploaded with the build:
- `index.html`
- hashed JS/CSS files
- `app-config.js`
- `.htaccess`
- `assets/`
- `brand/`

The `.htaccess` file is needed so direct refresh on Angular routes like `/login` and `/hr-dashboard` works.

## Upload changed source files

Backend changed files to upload into the API app:

```txt
src/config/env.js
src/config/cors.js
src/app.js
src/socket/socket.js
src/services/attendance.service.js
.env.cpanel.example
package.json
package-lock.json
```

Frontend source changed files included in the build:

```txt
public/app-config.js
public/.htaccess
src/app/features/hr/hr-dashboard.component.html
src/app/features/hr/hr-dashboard.component.ts
src/app/features/employee/employee-dashboard.component.html
src/app/features/employee/employee-dashboard.component.ts
```

## Common cPanel notes

- If MongoDB Atlas fails with timeout, add the cPanel server public IP in MongoDB Atlas Network Access.
- Keep the database path `/test` because current users are stored there.
- After backend upload, always restart the cPanel Node.js app.
- After frontend upload, hard refresh the browser or clear cache.