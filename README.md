# My Digital Library

A simple React (UMD) static app to manage and search your documents. No build step required; open `index.html` directly, or deploy as a static site.

## Local run

- Open `index.html` in a browser. That’s it.

## Deploy to Render (Static Site)

We include a `render.yaml` to make deployment easy.

### One-time setup

1. Create a new Git repo and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-git-remote-url>
   git push -u origin main
   ```
2. Log in to Render and create a new Static Site from your repo.
   - Name: `my-digital-library` (or anything)
   - Publish directory: `.`
   - Build command: leave empty
   - Auto deploy: enabled

### Using the blueprint (optional)

You can also click "New +" → "Blueprint" on Render and point it at your repo; it will read `render.yaml` and create the Static Site.

## Notes

- This app uses React via CDN and Babel standalone; it’s suitable for static hosting.
- Documents are stored in `localStorage` on the client; deployment has no server.

## Google Sign-In setup

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web).
2. Add your Render domain (and local `http://localhost` if needed) to Authorized JavaScript origins.
3. Copy the Client ID and replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in `index.html` meta tag.
4. Redeploy. The login screen will appear; sign in with Google to access the app.
