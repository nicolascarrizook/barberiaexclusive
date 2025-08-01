# Deployment Guide - Barbershop Booking System

## Vercel Deployment

### Prerequisites
1. Create a Vercel account at https://vercel.com
2. Install Vercel CLI (optional): `npm i -g vercel`

### Environment Variables
You need to configure these environment variables in Vercel:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

### Deployment Methods

#### Option 1: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Configure environment variables
5. Deploy

#### Option 2: Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

#### Option 3: Manual Upload
1. Build locally: `npm run build:vercel`
2. Go to https://vercel.com/new
3. Drag and drop the `dist` folder
4. Configure environment variables

### Post-Deployment Steps

1. **Configure Custom Domain** (Optional)
   - Go to your project settings in Vercel
   - Add your custom domain
   - Update DNS records as instructed

2. **Enable Analytics** (Optional)
   - Enable Vercel Analytics in project settings
   - No code changes required

3. **Monitor Performance**
   - Check Web Vitals in Vercel dashboard
   - Monitor error rates and performance metrics

### Build Configuration
The project includes `vercel.json` with:
- SPA routing configuration
- Security headers
- Cache optimization
- Regional deployment (US East & West)

### Troubleshooting

**Build Failures**
- The project uses `build:vercel` script which bypasses TypeScript checks
- If build fails, check environment variables are set correctly

**404 Errors**
- Vercel is configured for SPA routing
- All routes should redirect to index.html

**CORS Issues**
- Check Supabase URL is correct
- Ensure Supabase project allows your Vercel domain

### Alternative Deployment Options

#### Netlify
1. Similar to Vercel, supports GitHub integration
2. Create `netlify.toml`:
```toml
[build]
  command = "npm run build:vercel"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Docker + Cloud Run
1. Use included Dockerfile
2. Build: `docker build -t barbershop-booking .`
3. Deploy to Google Cloud Run, AWS ECS, or Azure Container Instances

#### Traditional Hosting
1. Build: `npm run build:vercel`
2. Upload `dist` folder to any static hosting service
3. Configure server for SPA routing (redirect all to index.html)

### Performance Tips
- Enable Vercel Edge Network for global CDN
- Use Vercel Image Optimization for any images
- Monitor Core Web Vitals in Vercel Analytics
- Consider enabling Vercel Edge Functions for API routes

### Security Checklist
- ✅ Environment variables are not exposed in client code
- ✅ Security headers configured in vercel.json
- ✅ HTTPS enforced by default on Vercel
- ✅ Supabase RLS policies protect data access