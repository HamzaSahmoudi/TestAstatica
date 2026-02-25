# Astatica Works

Fullstack portfolio application with Node.js + Express + MongoDB and vanilla HTML/CSS/JS frontend.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- `MONGODB_URI`: MongoDB connection string (e.g., `mongodb://localhost:27017`)
- `DB_NAME`: Database name (e.g., `astatica`)
- `SESSION_SECRET`: Random string for session encryption
- `ADMIN_USER`: Admin username
- `ADMIN_PASS_HASH`: bcrypt hash of your password
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret

### 3. Generate admin password hash

Create a script to generate bcrypt hash:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 10).then(hash => console.log(hash));"
```

Copy the generated hash to `ADMIN_PASS_HASH` in your `.env` file.

### 4. Seed database (optional)

Run the seed script to add sample works:

```bash
npm run seed
```

### 5. Start development server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## Project Structure

```
├── server/
│   ├── server.js       # Main Express server
│   ├── db.js           # MongoDB connection
│   ├── seed.js         # Database seeding
│   ├── routes/
│   │   ├── works.js    # Works API routes
│   │   └── admin.js    # Admin API routes
│   └── middleware/
│       └── auth.js     # Authentication middleware
├── public/
│   ├── css/styles.css
│   ├── js/
│   │   ├── works.js
│   │   ├── work-detail.js
│   │   └── admin.js
│   ├── works.html
│   ├── work.html
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   └── admin-new-work.html
├── .env.example
├── package.json
└── README.md
```

## Routes

| Route                  | Description                    |
| ---------------------- | ------------------------------ |
| `/works`               | Works grid page                |
| `/work/:slug`          | Work detail page               |
| `/admin`               | Admin login or dashboard       |
| `/admin/new`           | Add new work form              |
| `/api/works`           | GET works list                 |
| `/api/works/:slug`     | GET work by slug               |
| `/api/admin/login`     | POST admin login               |
| `/api/admin/logout`    | POST admin logout              |
| `/api/admin/works`     | GET/POST works (auth required) |
| `/api/admin/works/:id` | DELETE work (auth required)    |

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run seed` - Seed database with sample works

## Conventional Commits

Suggested commit structure:

```
feat: initial project setup with Express + MongoDB
feat: add works listing page with grid layout
feat: add work detail page with dynamic loading
feat: implement category filtering on frontend
feat: add admin authentication with bcrypt + session
feat: create admin dashboard with CRUD operations
feat: add image upload support via multer
chore: configure environment variables
chore: add seed script with sample data
docs: add README with setup instructions
fix: correct slug generation for duplicate titles
```

## Features

- Dark minimal UI inspired by Astatica design
- Category filtering (3D, VFX, Direction, Motion Graphics, etc.)
- YouTube video embedding
- Credits display (role + name)
- Admin authentication
- Image upload (URL or local file)
- Responsive grid layout
