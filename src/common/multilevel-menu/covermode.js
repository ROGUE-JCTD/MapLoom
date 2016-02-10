var arrayMenu = [
  {
    title: '{{ storyService.title }}',
    icon: 'fa fa-reorder',
    items: [
      {
        name: '<button type="button" class="btn btn-default btn-md" data-target="#mapProperties" data-toggle="modal">Summary</button><button data-target="#mapSave" data-toggle="modal" type="button" class="btn btn-default btn-md">Save MapStory...</button> <button type="button" class="btn btn-default btn-md">Preview</button>',
        link: '#'
      },
      {
        name: '<a href="#" id="addchapter" ng-click="addChapter();"><i class="fa fa-plus-square-o"></i> Add a new chapter</a>',
        link: '#'
      },
      {
        name: '<a href="/getskills" target="_blank"><i class="fa fa-support"></i> Help</a>',
        link: '#'
      }
    ]
  }
];
$(document).ready(function() {
  // HTML markup implementation, cover mode
  $('#menu').multilevelpushmenu({
    menu: arrayMenu,
    containersToPush: [$('pushobj')],
    mode: 'cover',
    onItemClick: function() {
      $item = arguments[2];
      var idOfClicked = $item[0].id;
      // If the item has the id 'deleteChapter', then spawn the modal
      if (idOfClicked === 'deleteChapter') {
        $('#chapterDelete').modal('show');
      }
      // If the item has the id 'addNewLayer', then spawn the modal
      if (idOfClicked === 'addNewLayer') {
        $('#add-layer-dialog').modal('show');
      }
    },
    onCollapseMenuEnd: function() {
      // Only if the entire menu is deactivated, expand map
      var active = $('#menu').multilevelpushmenu('activemenu');
      console.log(active);
      if (active.prevObject.length === 0) {
        $('#pushobj').css('width', '94%');
      }
    },
    onExpandMenuStart: function() {
      $('#pushobj').css('width', '74%');
    }
  });
});
