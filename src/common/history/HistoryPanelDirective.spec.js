describe('HistoryPanelDirective', function(){
  var element, scope, compiledElement, configService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_history'));
  beforeEach(module('history/partial/historypanel.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-history-panel></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
  }));

  describe('Get Commit Author', function(){
    var anon = 'Anonymous';
    // check whether Santa Claus exists.
    it('should return the name of the author', function() {
      var namen = 'santa claus';
      var author = compiledElement.scope().getCommitAuthor({author: {'name' : namen}});
      expect(author).toBe(namen);
    });
    // Then check for an undefined author
    it('undefined author should return anonymous', function(){
      var author = compiledElement.scope().getCommitAuthor({});
      expect(author).toBe(anon);
    });
    // finally check for a scenario in which the author's name 
    //   is null.
    it('null author name should return anonymous', function(){
      var author = compiledElement.scope().getCommitAuthor({author: {'name' : null}});
      expect(author).toBe(anon);
    });
  });
});
