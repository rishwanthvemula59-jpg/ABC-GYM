# Gym Management System - Complete SaaS Platform

A professional, production-ready gym management system built with Express.js, React, Supabase, and Twilio WhatsApp integration.

## 🎯 Features

✅ **User Authentication** - JWT-based with refresh tokens
✅ **Member Management** - Full member lifecycle
✅ **QR Code Check-in** - Wall-mounted QR system
✅ **WhatsApp Messaging** - Twilio integration for reminders
✅ **Attendance Tracking** - Real-time attendance
✅ **Membership Renewal** - Simple renewal flow
✅ **Engagement System** - Streaks, badges, achievements
✅ **Real-time Dashboard** - Socket.io powered
✅ **Reports & Analytics** - Monthly summaries
✅ **Email Notifications** - Gmail SMTP

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Redis (local or Upstash)
- Twilio Account (WhatsApp)
- Gmail Account (SMTP)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
# Server runs on http://localhost:3000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### 3. Insert Test Data
```bash
cd backend
node src/scripts/insertTestData.js
```

### 4. Login
- Email: `owner@gym.com`
- Password: `Test@1234`

## 📁 Project Structure

```
gym-management-system/
├── backend/              # Express.js API
├── frontend/             # React + Vite
└── deployment/           # Docker setup
```

## 📚 Documentation

- See `SETUP_GUIDE.md` for detailed setup
- See `DEPLOYMENT_GUIDE.md` for production deployment
- Check backend/README.md for API documentation

## 🔐 Environment Variables

### Backend (.env)
- Supabase credentials
- Twilio API keys
- Email (Gmail SMTP)
- Redis URL
- JWT secrets

### Frontend (.env)
- API URL
- Socket.io URL

## 🚢 Deployment

### Docker
```bash
docker-compose up -d
```

### Vercel (Frontend) + Render (Backend)
See deployment guide for step-by-step instructions.

## 💰 Cost

**Monthly Cost: ₹0** (All services have free tier)
- Supabase: Free tier
- Twilio: Free WhatsApp sandbox
- Render: Free tier
- Vercel: Free tier

## 📞 Support

For issues, check the troubleshooting section in SETUP_GUIDE.md

## 📄 License

MIT - Feel free to use for commercial projects

---

**Built by:** Gym Management System Team
**Updated:** May 2026
# ABC-Fitness-Studio
