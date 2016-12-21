describe('HistoryPanelDirective', function(){
  var element, scope, compiledElement, configService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_history'));
  beforeEach(module('history/partial/historypanel.tpl.html'));
     //templateUrl: 'history/partial/historypanel.tpl.html',

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-history-panel></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
  }));

  describe('Get Commit Author', function(){
    var anon = 'Anonymous';
    it('should return the name of the author', function() {
      var namen = 'santa claus';
      var author = compiledElement.scope().getCommitAuthor({author: {'name' : namen}});
      expect(author).toBe(namen);
    });
    it('undefined author should return anonymous', function(){
      var author = compiledElement.scope().getCommitAuthor({});
      expect(author).toBe(anon);
    });
    it('null author name should return anonymous', function(){
      var author = compiledElement.scope().getCommitAuthor({author: {'name' : null}});
      expect(author).toBe(anon);
    });
  });

/*
  describe('createOlFeatureBasedOnChange', function(){
    it('should return a valid OpenLayers feature object', function(){
      var diffLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
          parser: null
        })
      });
      var validationFeature;
      var olChangeFeature = diffService.createOlFeatureBasedOnChange(modifiedChange, repoId);
      diffLayer.getSource().addFeature(olChangeFeature);
      diffLayer.getSource().forEachFeature(function(iterFeature){
        if (iterFeature === olChangeFeature) {
          validationFeature = iterFeature;
        }
      });
      expect(olChangeFeature).toBe(validationFeature);
    });
  });

  describe('findChangeLayer', function(){
    it('should return the map layer to which the change object belongs', function(){
      var testLayer = diffService.findChangeLayer(modifiedChange, repoId, [mockLayer]);
      expect(testLayer).toBe(mockLayer);
    });
  });
*/
});
