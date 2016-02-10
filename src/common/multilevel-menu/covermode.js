$(document).ready(function() {
  // HTML markup implementation, cover mode
  $('#menu').multilevelpushmenu({
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
      if ($(idOfClicked.target).prop('tagName').toLowerCase() === 'input') {
        $(idOfClicked.target).focus();
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
