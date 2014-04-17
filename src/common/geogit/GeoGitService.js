(function() {
  var module = angular.module('loom_geogit_service', []);

  // Private Variables
  var nextRepoId = 0;

  // services
  var q, http, rootScope, dialogService_, translate_;

  var service_ = null;

  var issueRequest = function(URL, deferredResponse) {
    http.get(URL).then(function(response) {
      if (!goog.isDef(response.data.response.success) || response.data.response.success === true) {
        // Check for merge conflicts
        if (goog.isDef(response.data.response.Merge) && goog.isDef(response.data.response.Merge.conflicts)) {
          // Handle Merge Conflicts
          deferredResponse.reject(response.data.response.Merge);
        } else {
          deferredResponse.resolve(response.data.response);
        }
      } else {
        deferredResponse.reject(response.data.response.error);
      }
    }, function(reject, status, headers, config) {
      console.log('Issue Request was rejected', reject, status, headers, config);
      deferredResponse.reject(reject);
    }, function(update) {
      deferredResponse.update(update);
    });
  };

  module.provider('geogitService', function() {
    // public variables
    this.repos = [];

    this.$get = function($q, $http, $rootScope, dialogService, $translate) {
      service_ = this;
      q = $q;
      http = $http;
      rootScope = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;
      rootScope.$on('layerRemoved', service_.removedLayer);
      return service_;
    };

    this.getRepoById = function(repoId) {
      for (var index = 0; index < service_.repos.length; index++) {
        if (service_.repos[index].id == repoId) {
          return service_.repos[index];
        }
      }
      return null;
    };

    this.beginTransaction = function(repoId) {
      var deferredResponse = q.defer();

      service_.command(repoId, 'beginTransaction').then(function(response) {
        if (response.success === true) {
          var transaction = new GeoGitTransaction(service_.command, repoId, response.Transaction);
          deferredResponse.resolve(transaction);
        } else {
          deferredResponse.reject(response.error);
        }
      }, function(reject) {
        deferredResponse.reject(reject);
      }, function(update) {
        deferredResponse.update(update);
      });

      return deferredResponse.promise;
    };

    this.command = function(repoId, command, options) {
      var deferredResponse = q.defer();
      var repo = service_.getRepoById(repoId);
      if (goog.isDefAndNotNull(repo)) {
        var URL = repo.url + '/' + command + '?output_format=JSON';
        URL += '&_dc=' + new Date().getTime(); // Disable caching of responses.
        if (goog.isDefAndNotNull(options)) {
          for (var property in options) {
            if (property !== null && options.hasOwnProperty(property) && options[property] !== null) {
              var underscore = property.indexOf('_');
              var trimmed;
              if (underscore > 0) {
                trimmed = property.substring(0, property.indexOf('_'));
              } else {
                trimmed = property;
              }
              if (goog.isArray(options[property])) {
                for (var i = 0; i < options[property].length; i++) {
                  var element = options[property][i];
                  URL += '&' + trimmed + '=' + encodeURIComponent(element);
                }
              } else {
                URL += '&' + trimmed + '=' + encodeURIComponent(options[property]);
              }
            }
          }
        }
        issueRequest(URL, deferredResponse);
      }
      return deferredResponse.promise;
    };

    this.post = function(repoId, command, data) {
      var deferredResponse = q.defer();
      var repo = service_.getRepoById(repoId);
      if (goog.isDefAndNotNull(repo)) {
        var URL = repo.url + '/' + command;
        URL += '&_dc=' + new Date().getTime(); // Disable caching of responses.
        http.post(URL, data).then(function(response) {
          deferredResponse.resolve(response);
        }, function(reject) {
          deferredResponse.reject(reject);
        }, function(update) {
          deferredResponse.update(update);
        });
      }
      return deferredResponse.promise;
    };

    this.addRepo = function(newRepo) {
      var result = q.defer();
      for (var index = 0; index < service_.repos.length; index++) {
        var repo = service_.repos[index];
        if (repo.isEqual(newRepo)) {
          repo.refCount++;
          result.resolve(repo.id);
          return result.promise;
        }
      }
      newRepo.refCount = 1;
      newRepo.id = nextRepoId;
      nextRepoId = nextRepoId + 1;
      service_.repos.push(newRepo);
      service_.commitChanged(newRepo.id).then(function() {
        service_.loadRemotesAndBranches(newRepo, result);
      });

      return result.promise;
    };

    this.loadRemotesAndBranches = function(repo, result) {
      if (repo.remotes.length > 0) {
        goog.array.clear(repo.remotes);
      }
      if (repo.branches.length > 0) {
        goog.array.clear(repo.branches);
      }
      var remoteOptions = new GeoGitRemoteOptions();
      remoteOptions.list = true;
      remoteOptions.verbose = true;
      service_.command(repo.id, 'remote', remoteOptions).then(function(response) {
        if (goog.isDefAndNotNull(response.Remote)) {
          var remoteId = 0;
          forEachArrayish(response.Remote, function(remote) {
            repo.remotes.push({name: remote.name, url: remote.url, username: remote.username, branches: [],
              id: remoteId, active: false});
            remoteId++;
          });
        }
        var branchOptions = new GeoGitBranchOptions();
        branchOptions.list = true;
        branchOptions.remotes = true;
        service_.command(repo.id, 'branch', branchOptions).then(function(response) {
          var remoteIndex;
          if (goog.isDefAndNotNull(response.Local.Branch)) {
            forEachArrayish(response.Local.Branch, function(branch) {
              repo.branches.push(branch.name);
            });
          } else {
            console.log('Repository had no local branches: ', repo, response);
            service_.removeRepo(repo.id);
            result.reject(translate_('no_local_branches'));
            return;
          }
          if (goog.isDefAndNotNull(response.Remote.Branch)) {
            forEachArrayish(response.Remote.Branch, function(branch) {
              if (branch.name !== 'HEAD') {
                for (remoteIndex = 0; remoteIndex < repo.remotes.length; remoteIndex++) {
                  if (repo.remotes[remoteIndex].name === branch.remoteName) {
                    repo.remotes[remoteIndex].branches.push(branch.name);
                  }
                }
              }
            });
          }
          result.resolve(repo);
        }, function(reject) {
          console.log('Unable to get the repository\'s branches:', repo, reject);
          service_.removeRepo(repo.id);
          result.reject(translate_('unable_to_get_branches'));
        });
      }, function(reject) {
        console.log('Unable to get the repository\'s remotes:', repo, reject);
        service_.removeRepo(repo.id);
        result.reject(translate_('unable_to_get_remotes'));
      });
    };

    this.removeRepo = function(id) {
      var index = -1, i;
      for (i = 0; i < service_.repos.length; i = i + 1) {
        if (service_.repos[i].id === id) {
          index = i;
        }
      }
      if (index > -1) {
        service_.repos.splice(index, 1);
      }
    };

    this.removedLayer = function(event, removedLayer) {
      if (removedLayer.get('metadata').isGeoGit) {
        var repoId = removedLayer.get('metadata').repoId;
        var repo = service_.getRepoById(repoId);
        repo.refCount--;
        if (repo.refCount <= 0) {
          service_.removeRepo(repoId);
          rootScope.$broadcast('repoRemoved', repo);
        }
      }
    };

    this.parseWorkspaceRoute = function(featureType) {
      if (featureType) {
        var split = featureType.split(':');
        if (split.length === 1) {
          return {
            typeName: split[0]
          };
        }
        return {
          workspace: split[0],
          typeName: split[1]
        };
      }
      return null;
    };

    this.isNotLayerGroup = function(layer) {
      var featureType = layer.get('metadata').name;
      var url = layer.get('metadata').url + '/wms?version=' + settings.WMSVersion + '&request=DescribeLayer&layers=' +
          featureType;
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        // TODO: Refactor once there is a proper DescribeLayer parser
        // TODO: Test with imagery, or any layer without an associated WFS
        // TODO: Check to make sure it isn't a layer group with one layer
        var strings = response.data.split('</LayerDescription>');
        if (strings.length <= 2) {
          deferredResponse.resolve(response.data);
        } else {
          deferredResponse.reject('Is a Layergroup.');
        }
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getDataStoreName = function(layer) {
      var featureType = layer.get('metadata').name;
      var workspaceRoute = service_.parseWorkspaceRoute(featureType);
      var url = layer.get('metadata').url + '/rest/layers/' + featureType + '.json';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        var resourceUrl = response.data.layer.resource.href;
        var datastoreStartIndex = resourceUrl.indexOf(workspaceRoute.workspace + '/datastores');
        if (datastoreStartIndex === -1) {
          deferredResponse.reject('No datastore.');
        }
        datastoreStartIndex = datastoreStartIndex + workspaceRoute.workspace.length + 12;
        var datastoreEnd = resourceUrl.substr(datastoreStartIndex);
        var datastoreEndIndex = datastoreEnd.indexOf('/');
        var datastore = datastoreEnd.substring(0, datastoreEndIndex);
        deferredResponse.resolve(datastore);
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getDataStore = function(layer, name) {
      var url = layer.get('metadata').url + '/rest/workspaces/' + layer.get('metadata').workspace + '/datastores/' +
          name + '.json';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        if (goog.isDefAndNotNull(response.data) && goog.isDefAndNotNull(response.data.dataStore) &&
            goog.isDefAndNotNull(response.data.dataStore.type)) {
          deferredResponse.resolve(response.data.dataStore);
        } else {
          deferredResponse.reject(translate_('unable_to_get_datastore'));
        }
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getFeatureType = function(layer, dataStore) {
      var featureType = layer.get('metadata').name;
      var workspaceRoute = service_.parseWorkspaceRoute(featureType);
      var url = layer.get('metadata').url + '/rest/workspaces/' + workspaceRoute.workspace + '/datastores/' +
          dataStore.name + '/featuretypes/' + workspaceRoute.typeName + '.json';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        response.data.featureType.workspace = workspaceRoute.workspace;
        var featureType = response.data.featureType;
        url = layer.get('metadata').url + '/wfs?version=' + settings.WFSVersion +
            '&request=DescribeFeatureType&typeName=' + workspaceRoute.typeName;

        http.get(url).then(function(response) {
          // TODO: Use the OpenLayers parser once it is done
          var x2js = new X2JS();
          var json = x2js.xml_str2json(response.data);
          var schema = [];
          if (goog.isDefAndNotNull(json.schema)) {
            var savedSchema = layer.get('metadata').savedSchema;
            forEachArrayish(json.schema.complexType.complexContent.extension.sequence.element, function(obj) {
              schema[obj._name] = obj;
              schema[obj._name].visible = true;
              if (goog.isDefAndNotNull(savedSchema)) {
                for (var index = 0; index < savedSchema.length; index++) {
                  if (obj._name == savedSchema[index].name) {
                    schema[obj._name].visible = savedSchema[index].visible;
                  }
                }
              }
              if (goog.isDefAndNotNull(obj.simpleType)) {
                schema[obj._name]._type = 'simpleType';
              }
            });

            layer.get('metadata').schema = schema;
            layer.get('metadata').editable = true;
          }
          deferredResponse.resolve(featureType);
        }, function(reject) {
          deferredResponse.reject(reject);
        });
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    //gets the current commit id of a repository
    this.commitChanged = function(repoId) {
      var repo = service_.getRepoById(repoId);
      var url = repo.url + '/repo/manifest';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        var branchArray = response.data.split('\n');
        var branchData;
        var commitId = -1;

        for (var branch in branchArray) {
          branchData = branchArray[branch].split(' ');

          // > 2 elements means that this one is a sym ref, so we'll skip it
          // < 2  means that it's an empty array created by splitting the new line at the end of the response
          if (branchData.length != 2) {
            continue;
          }

          //get the index of the branch name to see if we're on the right branch
          //  the '/' is so that a search for 'master' won't leave us on a branch called '*_master'
          var branchNameIndex = branchData[0].indexOf('/' + repo.branch);

          //extract the branch name so that we can check the length and ensure we don't end up with 'master_*'
          var branchNameSubString = branchData[0].slice(branchNameIndex + 1);

          if (branchNameIndex !== -1 && branchNameSubString.length === repo.branch.length) {
            //these are the droids we're looking for
            commitId = branchData[1];
            break;
          }
        }
        var oldCommit = repo.commitId;
        repo.commitId = commitId;
        deferredResponse.resolve({
          repoid: repo.id,
          oldId: oldCommit,
          newId: repo.commitId,
          changed: oldCommit !== repo.commitId
        });
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.isGeoGit = function(layer) {
      if (goog.isDefAndNotNull(layer)) {
        var metadata = layer.get('metadata');
        if (!goog.isDefAndNotNull(metadata.isGeoGit)) {
          // First check to see if this is not a layer group
          service_.isNotLayerGroup(layer).then(function() {
            // Then get the layer information from the server for the datastore name
            service_.getDataStoreName(layer).then(function(dataStoreName) {
              // Then get the datastore to determine if it is a geogit datastore or not
              service_.getDataStore(layer, dataStoreName).then(function(dataStore) {
                // Finally get the needed information stored on the layer and create the repo object
                if (dataStore.type === 'GeoGIT') {
                  var repoName = dataStore.connectionParameters.entry[0].$;
                  repoName = repoName.substring(repoName.lastIndexOf('/' || '\\') + 1, repoName.length);

                  metadata.branchName = dataStore.connectionParameters.entry[1].$;

                  //the branch name will apparently come back as 'false' if its on master,
                  // so we need to correct for that
                  if (metadata.branchName === 'false') {
                    metadata.branchName = 'master';
                  }
                  var promise = service_.addRepo(
                      new GeoGitRepo(metadata.url + '/geogit/' + metadata.workspace + ':' + dataStore.name,
                          dataStore.connectionParameters.entry[1].$, repoName));
                  promise.then(function(repo) {
                    if (goog.isDef(repo.id)) {
                      rootScope.$broadcast('repoAdded', repo);
                      metadata.repoId = repo.id;
                    } else {
                      metadata.repoId = repo;
                    }
                  }, function(reject) {
                    dialogService_.error(translate_('error'), translate_('unable_to_add_remote') + reject);
                  });
                  metadata.isGeoGit = true;
                  metadata.geogitStore = dataStore.name;
                  metadata.repoName = repoName;
                } else {
                  metadata.isGeoGit = false;
                }
                service_.getFeatureType(layer, dataStore).then(function(featureType) {
                  metadata.projection = featureType.srs;
                  // ping proj4js to pre-download projection if we don't have it
                  ol.proj.getTransform(metadata.projection, 'EPSG:4326');
                  metadata.nativeName = featureType.nativeName;
                  rootScope.$broadcast('layerInfoLoaded', layer);
                }, function(rejected) {
                  dialogService_.error(
                      translate_('error'), translate_('unable_to_get_feature_type') + ' (' + rejected.status + ')');
                });
              }, function(rejected) {
                dialogService_.error(
                    translate_('error'), translate_('unable_to_get_datastore') + ' (' + rejected.status + ')');
              });
            }, function(rejected) {
              if (goog.isDefAndNotNull(rejected.status)) {
                dialogService_.error(
                    translate_('error'), translate_('unable_to_get_datastore_name') + ' (' + rejected.status + ')');
              }
            });
          }, function(rejected) {
            if (goog.isDefAndNotNull(rejected.status)) {
              dialogService_.error(
                  translate_('error'), translate_('layer_was_layer_group') + ' (' + rejected.status + ')');
            }
          });
        }
      }
    };
  });
}());
