# صوت الكورة - Backend API

## Deployment to Railway

### Required Environment Variables:

```
MONGO_URL=mongodb+srv://YOUR_MONGODB_ATLAS_URL
DB_NAME=koravoice
JWT_SECRET_KEY=YOUR_SECURE_SECRET_KEY
AGORA_APP_ID=b2c1cf7c621b48f2b1bf68cdf13f6bed
AGORA_APP_CERTIFICATE=ccd5087d340d4aeabdeef13d84244a1f
BACKEND_URL=https://YOUR_RAILWAY_URL
CORS_ORIGINS=*
VAPID_PRIVATE_KEY=cbu7CEw-z-AuG2i6fc3ybiwA9jEoLL6tT0dGuyOTixY
VAPID_PUBLIC_KEY=BP2MtHk2NHU-dWjaGJvWVfrXSDFP-xaA2mOz27oLFFVSMyXQxACtHOOywJqLe-d3oJ7ETN8LRq6k51hB8UI_eL4
VAPID_SUBJECT=mailto:naifliver@gmail.com
STRIPE_SECRET_KEY=sk_test_emergent
API_FOOTBALL_KEY=ee999f6d874054a7ae6aca5b32768091
PORT=8001
```

### Steps to Deploy:

1. Push this folder to GitHub
2. Go to railway.app
3. Create new project from GitHub repo
4. Select this backend folder
5. Add environment variables
6. Deploy!

### MongoDB Atlas Setup:

1. Go to mongodb.com/atlas
2. Create free cluster
3. Get connection string
4. Add to MONGO_URL
