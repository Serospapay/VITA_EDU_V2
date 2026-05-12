# VITA-Edu | Online IT School

**Your path to the world of technology** — Modern platform for learning programming and IT technologies

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![Node](https://img.shields.io/badge/node-18.x-green)
![React](https://img.shields.io/badge/react-18.x-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

---

## Quick Start

### Installation (one time)

**Requirements:**
1. Node.js 18+ — https://nodejs.org/
2. PostgreSQL 14+ — https://www.postgresql.org/download/windows/
3. Memurai (Redis) — https://www.memurai.com/ (optional)

**Run setup:**
```powershell
.\setup.ps1
```

Enter PostgreSQL password and wait 5-10 minutes.

### Database backup and moving to another machine

Instructions (Ukrainian) and scripts: **[`database-transfer/README.uk.md`](database-transfer/README.uk.md)** — резерв PostgreSQL та архів файлів із `backend/uploads`.

---

### Daily Launch

**Double-click:**
```
start.bat
```

Or in PowerShell:
```powershell
.\start.bat
```

**Done!** Automatically:
- Backend starts (http://localhost:5000)
- Frontend starts (http://localhost:3000)
- Browser opens

---

## Test Accounts

**All passwords:** `password123`

### ADMIN
- `admin@vitaedu.com` — Full system access

### TEACHERS (3)
- `dmytro.koval@vitaedu.com` — Full-Stack MERN Course
- `olena.sydorenko@vitaedu.com` — React & Next.js Course
- `andrii.melnyk@vitaedu.com` — Node.js Backend Course

### STUDENTS (15)
- `denys.lysenko@student.vitaedu.com` ⭐ (Demo Account)
- `ivan.petrenko@student.vitaedu.com`
- `maria.kovalenko@student.vitaedu.com`
- `oleg.bondarenko@student.vitaedu.com`
- `anna.moroz@student.vitaedu.com`
- ...and 10 more (see RESEED.md for full list)

**Database Content:**
- 3 Courses (Full-Stack MERN, React & Next.js, Node.js Backend)
- 3 Categories, 9 Lessons with full content, 3 Assignments
- 25 Active Enrollments with progress tracking
- 6 Submissions with files and GitHub links
- Notifications and Announcements

### 👨‍💼 Administrator Features

**Login as Admin:** `admin@vitaedu.com` / `password123`

**Full System Control:**
- ✅ **User Management** - Create, Edit, Delete users; Assign roles (Admin/Teacher/Student)
- ✅ **Course Management** - Create courses and assign teachers; Edit courses and change teachers; Manage course status (Draft/Published/Archived)
- ✅ **Student Enrollment** - Manually enroll students in courses; View student progress; Remove students from courses
- ✅ **Analytics & Charts** - Real-time statistics dashboard; Bar and Pie charts visualization; User distribution analysis


---

## What's Included

### Backend (Node.js + TypeScript + Express)
- REST API (30+ endpoints)
- JWT Authentication + RBAC
- PostgreSQL + Prisma ORM (15+ tables)
- WebSocket (Socket.io) for real-time
- Redis for caching (optional)
- Swagger API documentation
- Migrations and seed data

### Frontend (React + TypeScript + Vite)
- 15+ pages
- Redux Toolkit for state management
- React Query for API
- TailwindCSS with custom purple-blue theme
- Responsive design
- Real-time chat and notifications

### VITA-Edu Features
- IT courses (Frontend, Backend, Full-Stack, Mobile, DevOps, UI/UX)
- Role system (Admin, Teacher, Student)
- Video lessons and materials
- Practical assignments and tests
- Grading system
- Real-time chat and notifications
- File manager
- Completion certificates

---

## Docker (Alternative)

```bash
docker-compose up -d
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npx prisma db seed
```

Open: http://localhost:3000

---

## Links

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Docs (Swagger):** http://localhost:5000/api-docs
- **Health Check:** http://localhost:5000/health

**🌐 Network Access:** Доступно з локальної мережі! Запустіть додаток, щоб побачити IP-адресу. Інші пристрої в мережі можуть підключитися через http://your-ip:3000

---

## Tech Stack

**Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma, Redis, Socket.io, JWT

**Frontend:** React, TypeScript, Vite, Redux Toolkit, React Query, TailwindCSS, Chart.js

**DevOps:** Docker, docker-compose

---

## Documentation

- **[SETUP_NEW_PC.md](SETUP_NEW_PC.md)** — Detailed setup instructions for new PC
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Production deployment guide (Railway)
- **[STABLE_SERVER_SETUP.md](STABLE_SERVER_SETUP.md)** — Stable server setup with PM2
- **[LOCAL_SERVER_SETUP.md](LOCAL_SERVER_SETUP.md)** — Local server setup for network access

---

## Useful Commands

### Backend
```bash
cd backend
npm run dev          # Development mode
npm run build        # Production build
npx prisma studio    # Database GUI
npx prisma db seed   # Seed test data
```

### Frontend
```bash
cd frontend
npm run dev          # Development mode
npm run build        # Production build
```

### Docker
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f backend    # View backend logs
```

---

## Troubleshooting

### Backend Not Starting

**Issue:** AggregateError - Redis not available

**Solution:** 
- Install Memurai: https://www.memurai.com/
- OR ignore — backend works without Redis (no caching)

**Issue:** Database connection error

**Solution:**
1. Check if PostgreSQL is running:
   - Services → postgresql-x64-14 → Running
2. Check password in `.env` (project root):
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lms_db
   ```

### Frontend CSS Errors

**Solution:**
```bash
cd frontend
rm -rf node_modules
npm install
```

### Port Already in Use

**Solution:**
```powershell
# Find process
netstat -ano | findstr :5000

# Kill process
taskkill /PID <number> /F
```

---

## For Diploma / Thesis

Project includes:
- Complex architecture (Layered Architecture)
- Modern tech stack
- Full database with migrations
- Authentication and authorization
- Real-time features
- REST API with documentation
- Responsive UI
- Docker containerization

**Ready for presentation and defense!**

---

## Project Structure

```
vita-edu/
├── backend/              # Node.js API
│   ├── src/
│   │   ├── controllers/  # API controllers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, validation
│   │   └── socket/       # WebSocket
│   └── prisma/           # Database schema
│
├── frontend/             # React App
│   └── src/
│       ├── components/   # UI components
│       ├── pages/        # Pages
│       ├── store/        # Redux
│       └── services/     # API client
│
├── docs/                 # Documentation
├── setup.ps1            # Automatic setup
└── start.bat            # Launch script
```

---

## License

MIT License

---

**Questions? See [SETUP_NEW_PC.md](SETUP_NEW_PC.md)**




