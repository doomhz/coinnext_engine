
/**
 * Module dependencies.
 */

var restify = require('restify');
var fs = require('fs');
var environment = process.env.NODE_ENV || 'development';
var config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', encoding='utf8'))[environment];

// Configure globals
GLOBAL.appConfig = function () {return config;};
GLOBAL.db = require('./models/index');

// Setup express
var server = restify.createServer();
var port = process.env.PORT || 7000;
server.listen(process.env.PORT || 7000, function(){
  console.log("Coinnext exchange engine is running on port %d in %s mode", port, environment);
});


// Routes
require('./routes/orders')(server);
