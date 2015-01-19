#!/usr/local/bin/node

/*
  Before building, run the followng commands:

  > npm install -g nodewebkit
  > npm install -g node-webkit-builder
  > npm install -g browserify
*/

var NwBuilder = require('node-webkit-builder');
var browserify = require('browserify');
var fs = require('fs');
var spawn = require('child_process').spawn;

if (process.argv.length > 2) {
  var mode = process.argv[2];

  if (mode == 'prod' || mode == 'dev') {
    var b = browserify();

    // Bundle the JS
    b.add('./src/js/router.js');

    b.bundle(function(err, buf) {
      fs.writeFileSync('./src/js/bundle.js', buf);
    });

    // Build with nwbuild only if for production
    if (mode == 'prod') {
      var nw = new NwBuilder({
        files: ['src/**'],
        platforms: ['osx64', 'win64'],
        buildDir: './dist'
      });

      nw.build().then(function() {
        console.log('Build completed.');
      }).catch(function(error) {
        console.error(error);
      });

      /*
        TODO: replace all occurences of node-webkit to app's name in info.plist
        after build for OS X
      */
    }

    // Run the app in dev
    if (mode == 'dev') {
      var nw = spawn('nodewebkit', ['./src']);

      // Redirect stdout and stderr
      nw.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
      });

      nw.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
      });
    }
  }

  else
    console.log('Supported modes: `dev`, `prod`.');
}

else
  console.log('Please enter a build mode.');
