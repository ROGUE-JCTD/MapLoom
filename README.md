MapLoom
============

MapLoom is a web client that leverages GeoGit to allow people to edit geographic information, view history, and sync with other GeoGit repositories.  The goal is to put the power of distributed versioned editing into the hands of users.  It's been developed to sit inside of [GeoNode](http://geonode.org) as an alternative to the default GeoNode map client but it can also be set up to stand alone.

## Details

MapLoom has been built using [OpenLayers 3](http://ol3js.org), Angular, and Bootstrap.  

License: The MapLoom source code is licensed under the [BSD 3 clause](http://opensource.org/licenses/BSD-3-Clause) license. 

### WPS & Feature Type Attributes Statistics Considerations
We are utilizing Geoserver Web Processing Services in a couple of places. For example, the 'zoom to layer data' uses a wps that is already included in geoserver. In the layer's table view, we have added the ability to view charts and statistics on the attribute values for the whole layer or a set of filtered features of a layer. To Accomplish this, we created a custom WPS called summarize_attrib which is using the geoscript functionality in geoserver. When the summarize/statistics button is clicked in maploom, geoserver will need to have the wps available. If you are using a geoserver instance that was created and configured using the [geoshape](http://www.geoshape.org) script, everything will be taken care of already and you do not need to do anything mentioned here. If you are using a different deployment of geoserver, you'll need: 1) the geoserver wps extention, 2) commons-math3-3.3.jar, 3) geoserver-2.5-SNAPSHOT-python-plugin.zip, and 4) the [scripts folder](https://github.com/ROGUE-JCTD/geoserver_data/blob/master/scripts)

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
