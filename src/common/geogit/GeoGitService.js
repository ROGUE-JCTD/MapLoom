(function() {
  var module = angular.module('loom_geogit_service', []);

  // Private Variables
  var repos = [];
  var nextRepoId = 0;
  var q, http;

  var issueRequest = function(URL, deferredResponse) {
    http.jsonp(URL).then(function(response) {
      if (!goog.isDef(response.data.response.success) || response.data.response.success === true) {
        deferredResponse.resolve(response.data.response);
      } else {
        deferredResponse.reject(response.data.response.error);
      }
    }, function(reject) {
      deferredResponse.reject(reject);
    }, function(update) {
      deferredResponse.update(update);
    });
  };

  module.provider('geogitService', function() {
    this.$get = function($q, $http) {
      q = $q;
      http = $http;
      repos.push(
          new GeoGitRepo('http://geoserver.rogue.lmnsolutions.com/geoserver/geogit/geonode:tegu_op_repo', 'master')
      );
      return this;
    };

    this.beginTransaction = function(repoId) {
      var deferredResponse = q.defer();
      var service = this;

      service.command(repoId, 'beginTransaction').then(function(response) {
        if (response.success === true) {
          var transaction = {
            command: function(command, options) {
              if (!goog.isDefAndNotNull(options)) {
                options = {};
              }
              options.transactionId = response.Transaction.ID;
              return service.command(repoId, command, options);
            },
            finalize: function() {
              return service.command(repoId, 'endTransaction',
                  {'transactionId': response.Transaction.ID}
              );
            },
            abort: function() {
              return service.command(repoId, 'endTransaction',
                  {'transactionId': response.Transaction.ID, 'cancel': true}
              );
            }
          };
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
      var repo = repos[repoId];
      if (goog.isDefAndNotNull(repo)) {
        var URL = repo.url + '/' + command + '?output_format=JSON&callback=JSON_CALLBACK';
        if (goog.isDefAndNotNull(options)) {
          for (var property in options) {
            if (property !== null && options.hasOwnProperty(property)) {
              var trimmed = property.substring(0, property.indexOf('_'));
              if (goog.isArray(options[property])) {
                for (var i = 0; i < options[property].length; i++) {
                  var element = options[property][i];
                  URL += '&' + trimmed + '=' + element;
                }
              } else {
                URL += '&' + trimmed + '=' + options[property];
              }
            }
          }
        }
        issueRequest(URL, deferredResponse);
      }
      return deferredResponse.promise;
    };

    this.getRepos = function() {
      return repos;
    };

    this.addRepo = function(repo) {
      repo.id = nextRepoId;
      nextRepoId = nextRepoId + 1;
      repos.push(repo);
    };
  });

}());
