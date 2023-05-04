require('dotenv').config('.env');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const express = require('express');
const app = express();
const morgan = require('morgan');
const { PORT = 3000 } = process.env;
// TODO - require express-openid-connect and destructure auth from it

const { User, Cupcake } = require('./db');

// middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended:true}));

/* *********** YOUR CODE HERE *********** */
// follow the module instructions: destructure config environment variables from process.env
// follow the docs:
  // define the config object
  // attach Auth0 OIDC auth router
  // create a GET / route handler that sends back Logged in or Logged out

const { auth, requiresAuth } = require('express-openid-connect');

const {
  AUTH0_SECRET,
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_BASE_URL,
} = process.env;

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: AUTH0_SECRET,
  baseURL: AUTH0_AUDIENCE,
  clientID: AUTH0_CLIENT_ID,
  issuerBaseURL: AUTH0_BASE_URL,
};

const {JWT_SECRET} = process.env;

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

app.use(async (req, res, next) => {
  const [user] = await User.findOrCreate({
    where: {
      username: req.oidc.user.nickname,
      name: req.oidc.user.name,
      email: req.oidc.user.email,
    }
  });
  next();
});

setUser = async (req, res, next) => {
  const auth = req.header('Authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
      req.user = null;
      next();
  } else {
      try {
          const token = auth.split(' ')[1];
          userObj = jwt.verify(token, JWT_SECRET);
          req.user = await User.findByPk(userObj.id);
          next();
      } catch (err) {
          req.user = null;
          next();
      }
  }
};

// req.isAuthenticated is provided from the auth router
app.get('/', (req, res) => {
  res.send(req.oidc.isAuthenticated() ?
    `
    <h1 style="color:pink;text-align:center;">Crypto Cupcakes!</h1>
    <h2 style="text-align:center;">Welcome, ${req.oidc.user.name}</h1>
    <h3 style="text-align:center;">Username: ${req.oidc.user.nickname}</h2>
    <p style="text-align:center;">${req.oidc.user.email}</p>
    <img style="display:block;margin:0 auto;" src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="User Profile Picture"></img>
    `
    : 'Logged out');
});

app.get('/cupcakes', async (req, res, next) => {
  try {
    const cupcakes = await Cupcake.findAll();
    res.send(cupcakes);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.post('/cupcakes', async (req, res, setUser, next) => {  
  if (!req.user) {
    res.sendStatus(401);
  } else {
    try {
      const newCupcake = await Cupcake.create({
        title: req.body.title,
        flavor: req.body.flavor,
        stars: req.body.stars,
        userId: req.user.id
      })
      res.send(newCupcake);
    } catch (err) {
        req.user = null;
        next();
    }
  }
});

// error handling middleware
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

app.listen(PORT, () => {
  console.log(`Cupcakes are ready at http://localhost:${PORT}`);
});

