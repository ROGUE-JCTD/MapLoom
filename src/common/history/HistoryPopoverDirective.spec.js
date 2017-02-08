describe('HistoryPopoverDirective', function(){
  //var element, scope, compiledElement, configService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_history'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_) {
    scope = $rootScope.$new();
    scope.commit = {};
    element = angular.element('<div class="loom-history-popover"></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
  }));

  describe('check safeName', function() {
    var anon = 'Anonymous';
    // check whether Santa Claus exists.
    it('should return the name of the author', function() {
      var namen = 'santa claus';
      var author = compiledElement.scope().safeName({'name' : namen});
      expect(author).toBe(namen);
    });
    // Then check for an undefined author
    it('undefined author should return anonymous', function(){
      var author = compiledElement.scope().safeName({});
      expect(author).toBe(anon);
    });
    // finally check for a scenario in which the author's name 
    //   is null.
    it('null author name should return anonymous', function(){
      var author = compiledElement.scope().safeName({name: null});
      expect(author).toBe(anon);
    });
    // check that anonymous returns for a null committer.
    it('undefined author should return anonymous', function(){
      var author = compiledElement.scope().safeName(undefined);
      expect(author).toBe(anon);
    });
  });


  describe('check safeEmail', function() {
    var anon = 'No Email';
    // check a given email address
    it('should return the email address of the author', function() {
      var email = 'super@email.io';
      var author = compiledElement.scope().safeEmail({'email' : email});
      expect(author).toBe(email);
    });
    // Then check for an undefined author
    it('undefined author should return no_email', function(){
      var author = compiledElement.scope().safeEmail({});
      expect(author).toBe(anon);
    });
    // finally check for a scenario in which the author's email
    //   is null.
    it('null author email should return no_email', function(){
      var author = compiledElement.scope().safeEmail({email: null});
      expect(author).toBe(anon);
    });
    // check that no_email returns for a null committer.
    it('undefined author should return no_email', function(){
      var author = compiledElement.scope().safeEmail(undefined);
      expect(author).toBe(anon);
    });
  });

});
