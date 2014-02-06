(function() {
  var module = angular.module('loom_remote_service', []);

  var q_;
  var translate_;
  var rootScope_;
  var http_;
  var service_;
  var dialogService_;
  var geogitService_;

  var counter = 0;

  module.provider('remoteService', function() {

    this.remoteName = null;
    this.remoteURL = null;
    this.remoteUsername = '';
    this.remotePassword = '';
    this.selectedRepo = null;
    this.selectedRemote = null;
    this.selectedText = '';
    this.editing = false;
    this.verificationResult = null;
    this.compatibleRepos = [];
    this.selectedRepoInitialCommit = null;

    this.$get = function($rootScope, $http, $q, $translate, dialogService, geogitService) {
      q_ = $q;
      rootScope_ = $rootScope;
      translate_ = $translate;
      http_ = $http;
      service_ = this;
      dialogService_ = dialogService;
      geogitService_ = geogitService;

      service_.selectedText = '*' + $translate('new_remote');

      return this;
    };

    var resetForm = function() {
      service_.remoteName = null;
      service_.remoteURL = null;
      service_.remoteUsername = '';
      service_.remotePassword = '';
      service_.compatibleRepos = [];
      if (goog.isDefAndNotNull(service_.selectedRemote)) {
        service_.remoteName = service_.selectedRemote.name;
        service_.remoteURL = service_.selectedRemote.url;
        if (goog.isDefAndNotNull(service_.selectedRemote.username)) {
          service_.remoteUsername = service_.selectedRemote.username;
          service_.remotePassword = '********';
        }
      }
    };

    var checkCompatiblity = function(url, result) {
      http_.get(url + '/log?returnRange=true&output_format=JSON').then(function(logInfo) {
        if (logInfo.data.response.success === true) {
          if (logInfo.data.response.sinceCommit.id == service_.selectedRepoInitialCommit) {
            result.resolve(url);
          } else {
            result.reject(translate_('repo_not_compatible'));
          }
        } else {
          result.reject(logInfo.data.response.error);
        }
      }, function(reject) {
        result.reject(translate_('not_a_repo'));
      });
    };

    var multipleCompatibleRepos = function() {
      counter--;
      if (counter === 0) {
        if (service_.compatibleRepos.length > 1) {
          // Do something
          $('#remoteSelectDialog').modal('toggle');
        } else if (service_.compatibleRepos.length < 1) {
          service_.verificationResult.reject(translate_('no_compatible_repos'));
        } else {
          service_.verificationResult.resolve(service_.compatibleRepos[0]);
        }
      }
    };

    this.reset = function() {
      this.selectedRepo = null;
      this.selectedRepoInitialCommit = null;
      this.selectedRemote = null;
      this.selectedText = '*' + translate_('new_remote');
      this.editing = false;
      resetForm();
    };

    this.selectRemote = function(remote) {
      if (remote === null) {
        this.selectedText = '*' + translate_('new_remote');
      } else {
        this.selectedText = remote.name;
      }
      this.selectedRemote = remote;
      resetForm();
    };

    this.removeRemote = function() {
      dialogService_.warn(translate_('remote'), translate_('remote_remove'),
          [translate_('yes_btn'), translate_('no_btn')], false).then(function(button) {
        switch (button) {
          case 0:
            var options = new GeoGitRemoteOptions();
            options.remoteName = service_.selectedRemote.name;
            options.remove = true;
            var result = q_.defer();
            geogitService_.command(service_.selectedRepo.id, 'remote', options).then(function() {
              geogitService_.loadRemotesAndBranches(service_.selectedRepo, result);
              service_.selectRemote(null);
            });
            break;
        }
      });
    };

    this.addRemote = function(url, options, result) {
      if (!goog.isDefAndNotNull(options.remoteName)) {
        options.remoteName = service_.remoteName;
      }
      options.remoteURL = url;
      if (service_.remoteUsername !== '') {
        options.username = service_.remoteUsername;
      }
      if (service_.remotePassword !== '') {
        options.password = service_.remotePassword;
      }
      var remoteResult = q_.defer();
      geogitService_.command(service_.selectedRepo.id, 'remote', options).then(function(response) {
        var fetchOptions = new GeoGitFetchOptions();
        fetchOptions.remote = service_.remoteName;
        var successMessage = translate_('remote_add_success', {value: service_.remoteName});
        if (service_.editing) {
          service_.selectedText = service_.remoteName;
          service_.remoteURL = url;
          successMessage = translate_('remote_edit_success', {value: service_.remoteName});
        }
        geogitService_.command(service_.selectedRepo.id, 'fetch', fetchOptions).then(function() {
          geogitService_.loadRemotesAndBranches(service_.selectedRepo, remoteResult);
          remoteResult.promise.then(function(repo) {
            for (var index = 0; index < repo.remotes.length; index++) {
              if (repo.remotes[index].name === service_.remoteName) {
                repo.remotes[index].active = true;
                rootScope_.$broadcast('remoteAdded', repo);
              }
            }
            dialogService_.open(translate_('remote'), successMessage, [translate_('btn_ok')], false);
            result.resolve();
            if (!service_.editing) {
              resetForm();
            } else {
              service_.compatibleRepos = [];
              service_.selectedRemote.name = service_.remoteName;
              service_.selectedRemote.url = service_.remoteURL;
              service_.selectedRemote.username = service_.remoteUsername;
              service_.selectedRemote.password = service_.remotePassword;
            }
          });
        }, function(error) {
          geogitService_.loadRemotesAndBranches(service_.selectedRepo, remoteResult);
          result.resolve();
          var message = translate_('fetch_error');
          if (error.status == '408' || error.status == '504') {
            message = translate_('fetch_timeout');
          }
          dialogService_.error(translate_('fetch'), message,
              [translate_('btn_ok')], false);
          resetForm();
        });
      }, function(error) {
        if (error === 'REMOTE_ALREADY_EXISTS') {
          error = translate_('remote_already_exists');
        } else if (service_.editing) {
          error = translate_('remote_edit_error');
        } else {
          error = translate_('remote_add_error');
        }
        dialogService_.error(translate_('remote'), error,
            [translate_('btn_ok')], false);
        result.resolve();
        resetForm();
      });
    };

    this.startEditing = function() {
      this.editing = true;
      this.remotePassword = '';
    };

    this.finishRemoteOperation = function(save, result) {
      if (save) {
        var options = new GeoGitRemoteOptions();
        if (service_.editing) {
          options.update = true;
          options.newName = service_.remoteName;
          options.remoteName = service_.selectedRemote.name;
        }
        var url = service_.remoteURL;
        var index = url.lastIndexOf('/') + 1;
        if (index === url.length) {
          url = url.slice(0, url.length - 1);
          index = url.lastIndexOf('/') + 1;
        }
        var info = url.slice(index);
        var splitinfo = info.split(':');
        var extraPath = '';
        if (splitinfo.length > 1) {
          var temp = encodeURIComponent(encodeURIComponent(splitinfo[0])) + ':' +
              encodeURIComponent(encodeURIComponent(splitinfo[1]));
          url = url.replace(info, temp);
        }
        if (splitinfo[0] === 'geoserver') {
          extraPath = '/geogit';
        } else if (splitinfo[0] !== 'geogit') {
          extraPath = '/geoserver/geogit';
        }
        service_.verificationResult = q_.defer();
        http_.get(url + extraPath, {headers: {'Accept': 'text/json'}}).then(function(response) {
          if (!goog.isDefAndNotNull(response.data.repositories)) {
            checkCompatiblity(url, service_.verificationResult);
          } else {
            // TODO: Check all repos at that endpoint
            counter = response.data.repositories.length;
            var successFunc = function(url) {
              service_.compatibleRepos.push(url);
              multipleCompatibleRepos(counter);
            };
            var rejectFunc = function() {
              multipleCompatibleRepos(counter);
            };
            for (var index = 0; index < response.data.repositories.length; index++) {
              var repo = response.data.repositories[index];
              var compatibilityResult = q_.defer();
              checkCompatiblity(url + extraPath + '/' + repo, compatibilityResult);
              compatibilityResult.promise.then(successFunc, rejectFunc);
            }
          }
        }, function(error) {
          // There was a problem connecting to the endpoint
          if (error.status == '406' || error.status == '404') {
            checkCompatiblity(url, service_.verificationResult);
          } else {
            service_.verificationResult.reject(translate_('could_not_connect'));
          }
        });

        service_.verificationResult.promise.then(function(url) {
          service_.addRemote(url, options, result);
          service_.verificationResult = null;
        }, function(error) {
          service_.verificationResult = null;
          dialogService_.error(translate_('remote'), error, [translate_('btn_ok')], false);
          result.resolve();
          service_.editing = false;
        });
      } else {
        resetForm();
        service_.editing = false;
      }
    };
  });
}());

