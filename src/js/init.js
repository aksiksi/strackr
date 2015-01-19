var ADMIN = 'assilksiksi@gmail.com';

// Directory stuff
var DIR_SEP = process.platform == 'win32' ? '\\' : '/';
var BASE_DIR = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + DIR_SEP + 'STrackr' + DIR_SEP;
var LOG_DIR = process.platform == 'darwin' ? '/tmp/strackr_logs/' : 'C:\\%TEMP%\\strackr_logs\\';

// Setup app namespace
window.app = {
  Models: {},
  Views: {},
  Collections: {
    Comparators: {}
  },
  Router: null,
  activeView: null,
  DB: null,
  Data: {
    techs: [],
    modules: [],
  },
  CONFIG_DIR: BASE_DIR + 'config' + DIR_SEP
}

// Keep copy of Node's require for browserify support
var nodeRequire = require;

// File system
var fs = require('fs');
var mkdirp = require('mkdirp');

var os = require('os');

// NW
var gui = require('nw.gui');

// Moment.js for date manipulation
var moment = require('moment');

// Logging support for future
var bunyan = require('bunyan');

var NeDB = require('nedb');

// Create log file if not already there
try {
  fs.readFileSync(LOG_DIR + 'strackr.log');
}

catch (e) {
  // Create dir if not there
  mkdirp.sync(LOG_DIR);
}

var log = bunyan.createLogger({
  name: 'strackr',
  streams: [{
    path: LOG_DIR + 'strackr.log'
  }],
  level: 'debug'
});

// Load up DB and connect once
if (app.DB == null) {
  try {
    app.DB = new NeDB(BASE_DIR + 'db/tasks.db');
    app.DB.loadDatabase();
  }
  catch (e) {
    log.info('Error reading/creating the DB!... %s', e);
    alert('Database read error. Contact: ' + ADMIN);
  }
}

function loadConfig() {
  app.DefaultConfig = JSON.parse(fs.readFileSync('config/config-default.json'));

  // Load up CSV directory from config.json
  try {
    app.Config = JSON.parse(fs.readFileSync(app.CONFIG_DIR + 'config.json'));
  }

  // Create new if doesn't exist
  catch (e) {
    log.info('Creating new config folder...');
    mkdirp.sync(app.CONFIG_DIR);
    fs.writeFileSync(app.CONFIG_DIR + 'config.json', '{}');
    app.Config = {};
  }

  loadData();
}

function loadData() {
  // Load up techs
  var t = app.Config.technicians;
  var techs;
  var defaultTechs = Papa.parse(fs.readFileSync(app.DefaultConfig.technicians, {encoding: 'utf-8'}), {header: false, delimiter: ',', skipEmptyLines: true});

  var success = false;

  try {
    // If no technicians entry, fall back to default config
    techs = Papa.parse(fs.readFileSync(_.isUndefined(t) ? app.DefaultConfig.technicians : t, {encoding: 'utf-8'}), {header: false, delimiter: ',', skipEmptyLines: true});
  }

  catch (e) {
    log.info('Error reading file %s, %s', app.Config.technicians, e);
    alert('Problem reading technicians.csv file. Using default instead. Please change path on Config page.');
  }

  finally {
    // Revert to default config on either parsing or file read error
    if (!_.isUndefined(techs) && !_.isEmpty(techs.errors)) {
      log.info('Parsing error on init, %s', techs.errors);

      alert('Problem reading technicians.csv file. Using default instead. Please change path on Config page.');

      techs = defaultTechs;
    }
  }

  try {
    app.Data.techs = _.map(techs.data, function(t) {
      return {'Technician': t[0], 'Team': t[1]};
    });

    app.Data.modules = _.uniq(_.map(techs.data, function(t) { return t[1]; }));

    success = true;
  }

  catch (e) {
    log.info('Error in CSV format. %s', e);

    alert('Error in CSV format. Please check the Config page for an example.');
  }

  return success;
}

loadConfig();

// Setup a menu bar to support copy/paste/select all in OS X
if (process.platform == 'darwin') {
  var menubar = new gui.Menu({type: 'menubar'});
  menubar.createMacBuiltin('STrackr');
  gui.Window.get().menu = menubar;
}
