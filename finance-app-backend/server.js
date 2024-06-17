// server.js
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const schedule = require('node-schedule');

// Initialize app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());


// Passport config
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/financeapp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


// User schema and model
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});
const User = mongoose.model('User', UserSchema);

// Passport local strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'Incorrect username' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return done(null, false, { message: 'Incorrect password' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send('Unauthorized');
};

// Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();
  res.send('User registered');
});

app.post('/login', passport.authenticate('local'), (req, res) => {
  res.send('User logged in');
});

// Expense schema and routes
const ExpenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  amount: Number,
  category: String,
  date: { type: Date, default: Date.now }
});
const Expense = mongoose.model('Expense', ExpenseSchema);

app.post('/expenses', ensureAuthenticated, async (req, res) => {
  const { description, amount, category } = req.body;
  const newExpense = new Expense({ user: req.user._id, description, amount, category });
  await newExpense.save();
  res.send('Expense added');
});

app.get('/expenses', ensureAuthenticated, async (req, res) => {
  const expenses = await Expense.find({ user: req.user._id });
  res.json(expenses);
});

// Budget schema and routes
const BudgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  limit: Number,
  period: String // monthly or yearly
});
const Budget = mongoose.model('Budget', BudgetSchema);

app.post('/budgets', ensureAuthenticated, async (req, res) => {
  const { category, limit, period } = req.body;
  const newBudget = new Budget({ user: req.user._id, category, limit, period });
  await newBudget.save();
  res.send('Budget set');
});

app.get('/budgets', ensureAuthenticated, async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id });
  res.json(budgets);
});

// Bill schema and routes
const BillSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  amount: Number,
  dueDate: Date,
  paid: { type: Boolean, default: false }
});
const Bill = mongoose.model('Bill', BillSchema);

app.post('/bills', ensureAuthenticated, async (req, res) => {
  const { description, amount, dueDate } = req.body;
  const newBill = new Bill({ user: req.user._id, description, amount, dueDate });
  await newBill.save();

  schedule.scheduleJob(new Date(dueDate), () => {
    console.log(`Reminder: Bill due - ${description}, Amount: ${amount}`);
    // Send email or SMS reminder here
  });

  res.send('Bill added');
});

app.get('/bills', ensureAuthenticated, async (req, res) => {
  const bills = await Bill.find({ user: req.user._id });
  res.json(bills);
});

// Route to get financial advice
app.post('/get_advice', ensureAuthenticated, async (req, res) => {
  const { income, expense } = req.body;

  try {
    const response = await axios.post('http://localhost:5000/predict', { income, expense });
    const advice = response.data.prediction;
    res.json({ advice });
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
