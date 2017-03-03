# <a href="http://lighter.io/lighter" style="font-size:40px;text-decoration:none"><img src="https://cdn.rawgit.com/lighterio/lighter.io/master/public/lighter.svg" style="width:90px;height:90px"> Lighter</a>
[![Chat](https://badges.gitter.im/chat.svg)](//gitter.im/lighterio/public)
[![Version](https://img.shields.io/npm/v/lighter.svg)](//www.npmjs.com/package/lighter)
[![Downloads](https://img.shields.io/npm/dm/lighter.svg)](//www.npmjs.com/package/lighter)
[![Build](https://img.shields.io/travis/lighterio/lighter.svg)](//travis-ci.org/lighterio/lighter)
[![Coverage](https://img.shields.io/codecov/c/github/lighterio/lighter/master.svg)](//codecov.io/gh/lighterio/lighter)
[![Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](//www.npmjs.com/package/standard)


Lighter is a lightweight Node.js framework for web applications and APIs.

### Isomorphic JavaScript

When used for web applications, Lighter will render views either on the server or the
client.  This functionality will allow Lighter to optimize for low latency.  The first
request to your web app renders HTML and returns it to the browser, then views are
lazy-loaded into the client so that subsequent requests only need to return JSON that
the client can render using its cached views.

### Auto-routing

Lighter is influenced by the PHP framework CodeIgniter, in that by default, controllers
and their methods will automagically get added to the router based on their names and
where they are found under the controllers directory. This means you don't have to
write a ton of routing code, and you know where to find a controller method if you
know its URL, and vice versa.

### Performance

Lighter's default router is extremely simple so that it can respond faster than other
frameworks such as Express, Restify and Meteor. The caveat is that dynamic paths are
not supported by default, so you would need to do `/blog/article?id=1` rather than
`/blog/article/1`. It's a small price to pay for amazing server throughput.

### Building APIs

Lighter's simplicity makes it great for APIs, and we'll be adding functionality to
auto-generate API documentation.


## Quick Start

To use lighter, first you must install it.

```bash
npm install -g lighter
```

Using lighter is as simple as creating a lighter directory structure (as seen below)
and then creating an `app.js` that requires lighter.

```js
var lighter = require('lighter');

var app = lighter({

  initJymin: lighter.no,

  initPorta: lighter.no

});
```

Then you can run your app with Node.
```bash
node app
```

Soon, this setup process will be replaced with a CLI that will go something like:
```bash
sudo npm i -g lighter
lighter new myapp
cd myapp
node app
```

### Directory structure

#### Assets loaded with Chug

Lighter uses Chug to cache its static assets, and each type of asset comes from an
assigned directory. Chug also loads models views and controllers. Changes inside
those directories will trigger reloads of the items that have been changed.
```
/
  controllers/
  models/
  public/
  scripts/
  styles/
  views/
```

If you want to load assets from other directories (such as node_modules/), you can
add to the list of locations using an API method like `addPublics`, `addScripts`,
`addStyles` or `addViews`.

### Controllers

Here's a sample controller that you could save into
`/controllers/ContactController.js`:

```js
var Controller = require('lighter/lib/Controller');

module.exports = Controller.extend({

  index: function GET(request, response) {
    response.writeHead(200, {'content-type': 'text/html'});
    response.end('TODO: Show contact info and a form.');
  },

  send: function POST(request, response) {
    response.writeHead(200, {'content-type': 'text/html'});
    response.end('TODO: Thank the user for contacting us.');
  }

});
```

To see the contact us form, you would visit `/contact`, and the form you submit
would post to `/contact/send`. Once we have models, we can do more interesting
things here.


### Models

Models are coming soon...

### Views

Views are rendered by name from `response.view`.

The following would render a template that is stored at `/views/hello.ltl` with a
state indicating who to say hello to.
```js
function GET(request, response) {
  response.view('hello', {who: 'World'});
}
```


## API

#### lighter.addControllers(Array|string location)
The `location` argument can be a single location or an array of locations. Lighter
adds this location to the array of controller locations to be chugged.

#### lighter.addPublics(Array|string location)
The `location` argument can be a single location or an array of locations. Lighter
adds this location to the array of public file locations to be chugged.

#### lighter.addScripts(Array|string location)
The `location` argument can be a single location or an array of locations. Lighter
adds this location to the array of script file locations to be chugged.

#### lighter.addStyles(Array|string location)
The `location` argument can be a single location or an array of locations. Lighter
adds this location to the array of style file locations to be chugged.

#### lighter.addViews(Array|string location)
The `location` argument can be a single location or an array of locations. Lighter
adds this location to the array of view file locations to be chugged.

#### lighter.setApp(Object app)
If you would like to use Express (or another framework that exposes
`app.get(path, callback)` etc., to do your routing, you can set Lighter to do this.

#### lighter.setLog(Object log)
Set an alternative log that exposes `log.log(message)`.

#### lighter.setHttpPort(port)
Set the port that you would like Lighter to use for HTTP.

#### lighter.setHttpsPort(port)
Set the port that you would like Lighter to use for HTTPS.

#### lighter.setAsciiArt(art)
Set an array of lines that you would like to be displayed upon startup.

#### Object lighter.chug
A reference to the Chug module that Lighter uses.

#### Object lighter.beams
A reference to the Beams module that Lighter uses.

#### Object lighter.colors
A reference to the Colors module that Lighter uses.

#### Object lighter.app
A reference to the Express-like app that's been set via `lighter.setApp(app)`.

#### Object lighter.log
A reference to the log that's been set via `lighter.setLog(log)`.

#### Array|Object lighter.publics
The files that have been added via `lighter.setPublic(location)` or
found in the `publics/` directory.

#### Array|Object lighter.scripts
The scripts that have been added via `lighter.setPublic(location)` or
found in the `scripts/` directory.

#### Array|Object lighter.styles
The stylesheets that have been added via `lighter.setPublic(location)` or
found in the `styles/` directory.

#### Array|Object lighter.views
The views that have been added via `lighter.setPublic(location)` or
found in the `views/` directory.

#### Array|Object lighter.controllers
The controllers that have been found in the `controllers/` directory.

#### Array|Object lighter.models
The models that have been found in the `models/` directory.

#### lighter.env
The environment string that comes from process.env.NODE_ENV.  Expected values
are `dev`, `test`, `stage`, `canary` or `prod`.


## More on Lighter...
* [Contributing](//github.com/lighterio/lighter/blob/master/CONTRIBUTING.md)
* [License (ISC)](//github.com/lighterio/lighter/blob/master/LICENSE.md)
* [Change Log](//github.com/lighterio/lighter/blob/master/CHANGELOG.md)
* [Roadmap](//github.com/lighterio/lighter/blob/master/ROADMAP.md)
