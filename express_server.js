var express = require('express');
var cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
var app = express();
var PORT = 8080;

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(cookieSession({
  name: 'session',
  keys: ['keyboard'],

  //Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))


function generateRandomString() {
  let string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let shortURL = '';
  for (i = 0; i < 6; i++) {
    shortURL += string[Math.floor(Math.random() * (62 - 1) + 1)];
  }
  return shortURL;
}

function emailLookup(email) {
  for (var keys in users) {
    if (users[keys].email === email) {
      return true;
    }
  }
  return false;
}

function idLookup(email) {
  for (id in users) {
    if (users[id].email === email) {
      return id;
    }
  }
}

function passLookup(password, email) {
  var compare = users[idLookup(email)].password;
  if (bcrypt.compareSync(password, compare) === true) {
    return true;
  } else {
    return false;
  }
}

//Displays URLS belonging to the User who created them
function urlsForUser(id) {
  filteredURLDatabase = {};
  for (shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      filteredURLDatabase[shortURL] = urlDatabase[shortURL];
    }
  }
  return filteredURLDatabase;
}

var urlDatabase = {

  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "randomID"
  },

  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "randomID2"
  }

};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}

app.get("/", (request, response) => {
  response.redirect("urls/");
});

app.get("/urls.json", (request, response) => {
  response.send(urlDatabase);
})

app.get("/hello", (request, response) => {
  response.json("<html><body>Hello <b>World</b></body></html>\n")
})

app.get("/urls", (request, response) => {
  let templateVars = {
    urls: urlsForUser(request.session.user_id),
    user: users[request.session.user_id]
  };


  response.render("urls_index", templateVars);
})

//SHORT URL GENERATOR THAT TIES TO USER ID
app.post("/urls", (request, response) => {
  var num = generateRandomString()
  urlDatabase[num] = {
    longURL: request.body.longURL,
    userID: users[request.session.user_id].id
  }
  response.redirect("/urls/"+num)
});

// LOGIN POST
app.post("/login", (request, response) => {
  if (!emailLookup(request.body.email)) {
    response.status(403).end("Address cannot be found");
  } else if (emailLookup(request.body.email) && !passLookup(request.body.password, request.body.email)){
    response.status(403).end("Incorrect password");
  } else if (emailLookup(request.body.email) && passLookup(request.body.password, request.body.email)){
    request.session.user_id = idLookup(request.body.email);
  }

  let templateVars = {
    urls: urlsForUser(request.session.user_id),
    user: users[request.session.user_id]
  };

  response.redirect("/urls");

})

app.get("/login", (request, response) => {
  let templateVars = {
    urls: urlsForUser(request.session.user_id),
    user: users[request.session.user_id]
  };

  response.render("urls_login", templateVars);
})

//LOGOUT REMOVES USERNAME AND CLEARS COOKIES
app.post("/logout", (request, response) => {
  request.session = null;
  response.redirect("/urls");
})

// RENDER REGISTRATION TEMPLATE
app.get("/register", (request, response) => {
  let templateVars = {
    urls: urlsForUser(request.session.user_id),
    user: users[request.session.user_id]
  };
  response.render("urls_register", templateVars);
})

//REGISTRATION HANDLER w/BCRYPT FUNCTIONALITY AND COOKIE SETTING
app.post("/register", (request, response) => {
  if (!request.body.email || !request.body.password) {
    response.send("ERROR 404 Please enter email and/or password");
  } else if (emailLookup(request.body.email)) {
    response.send("ERROR 404 Email address already taken")
  } else {
    const hashedPassword = bcrypt.hashSync(request.body.password, 10);
    genID = generateRandomString();
    users[genID] = {
      id: genID,
      email: request.body.email,
      password: hashedPassword,
    }

    request.session.user_id = genID;
    response.redirect("/urls");
  }
})

//PAGE FOR CREATING TINY URLS
app.get("/urls/new", (request, response) => {
  if (!request.session.user_id) {
    response.redirect("/login");
  } else {
    let templateVars = {
      urls: urlsForUser(request.session.user_id),
      user: users[request.session.user_id]
    };
    response.render("urls_new", templateVars);
}
});

// DELETE SHORT URLS
app.post("/urls/:shortURL/delete", (request, response) => {
  if (request.session.user_id) {
    delete urlDatabase[request.params.shortURL];
    response.redirect("/urls")
  } else {
    response.status(403).end()
  }
})

//SHORT URL EDIT PAGE
app.get("/urls/:shortURL", (request, response) => {
  let templateVars = {
    shortURL: request.params.shortURL,
    longURL: urlDatabase[request.params.shortURL].longURL ,
    user: users[request.session.user_id]
  }
  response.render("urls_show", templateVars);
})

app.post("/urls/:id", (request, response) => {
  if (request.session.user_id) {
    urlDatabase[request.params.id] = {
      longURL: request.body.longURL,
      userID: users[request.session.user_id].id
    }
    response.redirect("/urls")
  } else {
    response.status(403).end()
  }
})

//USE SHORT URL TO VISIT THE REFERENCING SITE
app.get("/u/:shortURL", (request, response) => {
  response.redirect(urlDatabase[request.params.shortURL].longURL);
});

//SERVER
app.listen(PORT, () => {
  console.log(`Example app listening on port: ${PORT}!`);
});

