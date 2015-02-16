# <a href="http://lighter.io/lighter" style="font-size:40px;text-decoration:none;color:#000"><img src="https://cdn.rawgit.com/lighterio/lighter.io/master/public/lighter.svg" style="width:90px;height:90px"> Lighter</a>
[![NPM Version](https://img.shields.io/npm/v/lighter.svg)](https://npmjs.org/package/lighter)
[![Downloads](https://img.shields.io/npm/dm/lighter.svg)](https://npmjs.org/package/lighter)
[![Build Status](https://img.shields.io/travis/lighterio/lighter.svg)](https://travis-ci.org/lighterio/lighter)
[![Code Coverage](https://img.shields.io/coveralls/lighterio/lighter/master.svg)](https://coveralls.io/r/lighterio/lighter)
[![Dependencies](https://img.shields.io/david/lighterio/lighter.svg)](https://david-dm.org/lighterio/lighter)
[![Support](https://img.shields.io/gratipay/Lighter.io.svg)](https://gratipay.com/Lighter.io/)


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

```javascript
var lighter = require('lighter');

var app = lighter({

  initJymin: lighter.no,

  initD6: lighter.no

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

```javascript
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
```javascript
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


## Acknowledgements

We would like to thank all of the amazing people who use, support,
promote, enhance, document, patch, and submit comments & issues.
Lighter couldn't exist without you.

Additionally, huge thanks go to [TUNE](http://www.tune.com) for employing
and supporting [Lighter](http://lighter.io/lighter) project maintainers,
and for being an epically awesome place to work (and play).


## MIT License

Copyright (c) 2014 Sam Eubank

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## How to Contribute

We welcome contributions from the community and are happy to have them.
Please follow this guide when logging issues or making code changes.

### Logging Issues

All issues should be created using the
[new issue form](https://github.com/lighterio/lighter/issues/new).
Please describe the issue including steps to reproduce. Also, make sure
to indicate the version that has the issue.

### Changing Code

Code changes are welcome and encouraged! Please follow our process:

1. Fork the repository on GitHub.
2. Fix the issue ensuring that your code follows the
   [style guide](http://lighter.io/style-guide).
3. Add tests for your new code, ensuring that you have 100% code coverage.
   (If necessary, we can help you reach 100% prior to merging.)
   * Run `npm test` to run tests quickly, without testing coverage.
   * Run `npm run cover` to test coverage and generate a report.
   * Run `npm run report` to open the coverage report you generated.
4. [Pull requests](http://help.github.com/send-pull-requests/) should be made
   to the [master branch](https://github.com/lighterio/lighter/tree/master).

### Contributor Code of Conduct

As contributors and maintainers of Lighter, we pledge to respect all
people who contribute through reporting issues, posting feature requests,
updating documentation, submitting pull requests or patches, and other
activities.

If any participant in this project has issues or takes exception with a
contribution, they are obligated to provide constructive feedback and never
resort to personal attacks, trolling, public or private harassment, insults, or
other unprofessional conduct.

Project maintainers have the right and responsibility to remove, edit, or
reject comments, commits, code, edits, issues, and other contributions
that are not aligned with this Code of Conduct. Project maintainers who do
not follow the Code of Conduct may be removed from the project team.

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported by opening an issue or contacting one or more of the project
maintainers.

We promise to extend courtesy and respect to everyone involved in this project
regardless of gender, gender identity, sexual orientation, ability or
disability, ethnicity, religion, age, location, native language, or level of
experience.
