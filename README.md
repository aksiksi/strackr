# STrackr

## Description

A simple task tracker built during my internship at Schlumberger.

## Dependencies

Everything should be clear from the included outer and inner package.json files.

For the build process:

* nw.js (or node-webkit)
* node-webkit-builder
* browserify

Once these are installed, use `./build.js dev` to build and run for development or `./build.js prod` to create builds for each of OS X and Windows (x64).

For the app itself:

* bunyan (for logging)
* node-mkdirp
* moment.js
* nedb (for task persistence)
