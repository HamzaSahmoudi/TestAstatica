const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "astatica";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  }),
);

let db;
async function getDB() {
  if (!db) {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    db = client.db(dbName);
  }
  return db;
}

async function initAdmin() {
  const db = await getDB();
  const adminCount = await db.collection("admins").countDocuments();
  if (adminCount === 0) {
    const hash = "$2b$10$iAexo3GoxFfUmhHSiqLEP.tDTcMh1vglK6qUYR51S3KXsiNWhxpHO";
    await db.collection("admins").insertOne({
      username: "alvinadmin",
      passwordHash: hash,
      createdAt: new Date(),
    });
    console.log("Default admin created: alvinadmin");
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBufferToCloudinary(fileBuffer, originalname) {
  const publicIdBase = originalname
    ? originalname.split(".").slice(0, -1).join(".") || "work-cover"
    : "work-cover";
  const safePublicId = slugify(publicIdBase) || "work-cover";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "astatica/works",
        resource_type: "image",
        public_id: `${safePublicId}-${Date.now()}`,
      },
      (error, result) => {
        if (error)
          return reject(
            error instanceof Error ? error : new Error(String(error)),
          );
        resolve(result);
      },
    );

    stream.end(fileBuffer);
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const categories = [
  "3D",
  "VFX",
  "Direction",
  "Motion Graphics",
  "Color Grading",
  "Post Production",
  "2D",
  "Production",
  "Live Action",
  "Interactive",
];

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/works", (req, res) => {
  res.sendFile(path.join(__dirname, "public/works.html"));
});

app.get("/work", (req, res) => {
  res.sendFile(path.join(__dirname, "public/work.html"));
});

app.get("/admin", (req, res) => {
  if (req.session.isAdmin)
    res.sendFile(path.join(__dirname, "public/admin.html"));
  else res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/api/categories", (req, res) => res.json(categories));

app.get("/api/works", async (req, res) => {
  const db = await getDB();
  const works = await db
    .collection("works")
    .find()
    .sort({ createdAt: -1 })
    .toArray();
  res.json(works);
});

app.get("/api/works/:slug", async (req, res) => {
  const db = await getDB();
  const work = await db.collection("works").findOne({ slug: req.params.slug });
  work ? res.json(work) : res.status(404).json({ error: "Not found" });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const db = await getDB();
  const admin = await db.collection("admins").findOne({ username });
  if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.post("/api/admin/works", upload.single("coverImage"), async (req, res) => {
  if (!req.session.isAdmin)
    return res.status(401).json({ error: "Unauthorized" });

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res
      .status(500)
      .json({ error: "Cloudinary is not configured on server" });
  }

  const db = await getDB();
  let slug = slugify(req.body.title);
  const existing = await db.collection("works").findOne({ slug });
  if (existing) slug = `${slug}-${Date.now()}`;

  let coverImage = req.body.coverImageUrl || "";
  if (req.file) {
    try {
      const uploadedImage = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.originalname,
      );
      coverImage = uploadedImage.secure_url;
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return res.status(500).json({ error: "Image upload failed" });
    }
  }

  const work = {
    title: req.body.title,
    slug,
    categories: req.body.categories
      ? req.body.categories.split(",").map((c) => c.trim())
      : [],
    description: req.body.description,
    youtubeUrl: req.body.youtubeUrl || "",
    coverImage,
    credits: req.body.credits ? JSON.parse(req.body.credits) : [],
    createdAt: new Date(),
  };

  await db.collection("works").insertOne(work);
  res.json({ success: true, work });
});

app.delete("/api/admin/works/:id", async (req, res) => {
  if (!req.session.isAdmin)
    return res.status(401).json({ error: "Unauthorized" });
  const db = await getDB();
  await db.collection("works").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

async function start() {
  await initAdmin();
  await getDB();
  app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
}
start();
