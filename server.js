const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://therishimishra:Rishi123@cluster0.qj0tyeo.mongodb.net/eventplanner?retryWrites=true&w=majority",
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log("Connected to the database");
  } catch (error) {
    console.log(error);
  }
};

connectDB();

// Define MongoDB models (Event and User)

const Event = mongoose.model("Event", {
  title: String,
  date: Date,
  organizer: String,
  attendees: [String], // Add attendees field to store RSVPs
});

const User = mongoose.model("User", {
  username: String,
  password: String,
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.sendStatus(401);

  jwt.verify(token, "your-secret-key", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(404).send("User not found");

  if (await bcrypt.compare(password, user.password)) {
    const accessToken = jwt.sign(
      { username: user.username },
      "your-secret-key"
    );
    res.json({ accessToken });
  } else {
    res.status(403).send("Incorrect password");
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).send("User registered successfully");
    console.log("user registered sucessfully");
  } catch (error) {
    console.error("Registration failed:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/events", authenticateToken, async (req, res) => {
  const { title, date, organizer } = req.body;
  const event = new Event({ title, date, organizer });
  await event.save();
  res.json(event);
});

app.get("/events", authenticateToken, async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

app.post("/events/:eventId/rsvp", authenticateToken, async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);

  if (!event) return res.status(404).send("Event not found");

  // Check if the user has already RSVP'd
  if (event.attendees.includes(req.user.username)) {
    return res.status(400).send("User has already RSVP'd to this event");
  }

  event.attendees.push(req.user.username);
  await event.save();

  res.json({ attendees: event.attendees });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
