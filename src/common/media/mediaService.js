(function() {
  var module = angular.module('loom_media_service', ['ngSanitize']);
  var service_ = null;
  var sce_ = null;
  var mediaHandlers_ = null;

  module.config(function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      new RegExp('^(http[s]?):\/\/(w{3}.)?youtube.com\/.+$'),
      new RegExp('^(http[s]?):\/\/(w{3}.)?soundcloud.com\/.+$'),
      new RegExp('^(http[s]?):\/\/(w{3}.)?imgur.com\/.+$')
    ]);

  });

  module.provider('mediaService', function() {

    this.$get = function($rootScope, $http, $sce, $translate) {
      sce_ = $sce;
      http_ = $http;
      translate_ = $translate;
      service_ = this;

      mediaHandlers_ = service_.configureDefaultHandlers();

      return service_;
    };

    this.configureDefaultHandlers = function() {

      var defaultHandlers = [
        {name: 'youtube', regex: /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])/i, callback: embed_youtube},
        {name: 'imgur', regex: /(?:https?:\/\/imgur\.com\/)[a-z]+\/(.*?)(?:[#\/].*|$)/i, callback: embed_imgur},
        {name: 'soundcloud', regex: /(?:https?:\/\/imgur\.com\/)[a-z]+\/(.*?)(?:[#\/].*|$)/i, callback: embed_soundcloud}
      ];

      return defaultHandlers;
    };

    this.isUrl = function(str) {
      if (!/^(f|ht)tps?:\/\//i.test(str)) {
        return false;
      }
      return true;
    };

    this.trustHTMLContent = function(html) {
      return sce_.trustAsHtml(html);
    };

    this.getEmbedContent = function(url, embed_width, embed_height) {

      var unsafeReturn = '<a href="' + url + '"> Unsafe Content </a>';

      for (var iHandler = 0; iHandler < mediaHandlers_.length; iHandler += 1) {
        var testHandler = mediaHandlers_[iHandler];
        if (testHandler.regex.test(url)) {
          return testHandler.callback(url, embed_width, embed_height);
        }
      }

      return unsafeReturn;
    };

    //Handler callbacks
    function embed_youtube(url, embed_width, embed_height) {

      var regex = /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/ig;

      var embed = url.replace(regex,
          '<iframe src="https://www.youtube.com/embed/$1" width="' + embed_width + '" height="' + embed_height + '" frameborder="0" allowfullscreen></iframe>');

      return embed;
    }

    function embed_imgur(url, embed_width, embed_height) {

    }

    function embed_soundcloud(url, embed_width, embed_height) {

    }


  });

})();
