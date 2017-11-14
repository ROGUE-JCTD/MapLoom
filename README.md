MapLoom [![Build Status](https://travis-ci.org/ROGUE-JCTD/MapLoom.svg?branch=master)](https://travis-ci.org/ROGUE-JCTD/MapLoom)
============

MapLoom is a web client that leverages GeoGig to allow users to edit geographic information, view history, and sync layers with other GeoGig repositories.  The goal is to put the power of distributed versioned editing into the hands of users.  It's been developed to sit inside of [GeoNode](http://geonode.org) as an alternative to the default GeoNode map client but it can also be set up to stand alone. The best way to see MapLoom in action is to create a GeoSHAPE virtual machine. Please visit [How To Get GeoSHAPE](https://docs.google.com/document/d/1KMpk6dXuqvwfEi0pfRpaGY62j6ikoYtpYUPU0sJQAmk) document for instructions.

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
Alternatively, the quick setup script will perform the installation steps.

```sh
$ git clone git://github.com/ROGUE-JCTD/MapLoom
$ cd MapLoom
$ ./quick-setup.sh
```

You can then open `file:///path/to/MapLoom/build/index.html` in your browser.

```clean-build``` will ensure that all modules all pulled down again and is recommended when you pull the source where other might have added new dependancies.

## Recommended Development Setup
The recommended way to develop maploom is to:

- create a [GeoSHAPE CentOS Virtual Machine](https://docs.google.com/document/d/1SOX8pldVskbnngXNLEfxFPlWkgC93lr8j3AE5mgmC_8) which will have maploom configured as GeoNodes viewer/editor. We recommend using the ```vagrant``` approach specified in the document.
- clone maploom repo on your host machine in the same folder in which you cloned the vagrant-geoshape repo
- expose the MapLoom repository on the host into the VM by uncommenting this line in your Vagrant file in the `geoshape-vagrant` folder [```Vagrantfile```](https://github.com/ROGUE-JCTD/geoshape-vagrant/blob/master/Vagrantfile#L18). Note that this assumes your `MapLoom` and `geoshape-vagrant` repositories are in the same folder.

   ```config.vm.synced_folder "../MapLoom", "/MapLoom"```

- run ```vagrant reload``` (or `vagrant halt` followed by `vagrant up`) to apply changes made to the vagrant file.
- run ```grunt watch``` in the maploom directory on the host to buid maploom
- symbolic link the built maploom into the virtual machine such that GeoNode uses the latest build maploom. from in-side the geoshape VM, run:
   ```
   geoshape-config maploom_dev
   ```
- you can now go to http://geoshape_vm_server_ip/maps/new or http://geoshape_vm_server_ip/layers to create a map from a layer. Changes on your host machine will cause `grunt watch` to rebuild MapLoom, and the symbolic links created by `geoshape-config maploom_dev` will make the newly buit maploom immediately available to Geonode in your VM.

Note that linter used by `grunt watch` is very paticular about the js programing style and guildlines. Be sure to fix all compile issues.

