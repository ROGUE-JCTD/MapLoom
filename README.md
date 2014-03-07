MapLoom
============

MapLoom is a web client that leverages GeoGit to allow people to edit geographic information, view history, and sync with other GeoGit repositories.  The goal is to put the power of distributed versioned editing into the hands of users.  It's been developed to sit inside of [GeoNode](http://geonode.org) as an alternative to the default GeoNode map client but it can also be set up to stand alone.

## Details

MapLoom has been built using [OpenLayers 3](http://ol3js.org), Angular, and Bootstrap.  

License: The MapLoom source code is licensed under the [BSD 3 clause](http://opensource.org/licenses/BSD-3-Clause) license. 

## Quick Start

Install Node.js and then:

```sh
$ git clone git://github.com/ROGUE-JCTD/MapLoom
$ cd MapLoom
$ sudo npm -g install grunt-cli karma bower
$ npm install
$ bower install
$ grunt watch
```

Finally, open `file:///path/to/MapLoom/build/index.html` in your browser.
