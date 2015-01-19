var playBtn = $('button.play');
var techFilter, filterClear;
var clicked = false;
var idx = 0;
var maxIdx = app.Data.techs.length;
var timeoutId = null;
var duration;

function timeoutFunction() {
  techFilter.val(app.Data.techs[idx++ % maxIdx]['Technician']);
  techFilter.trigger('keyup');

  duration = parseInt($('.duration').val());

  if (_.isNaN(duration))
      duration = 5;

  // Recursively schedule this function until stopped
  timeoutId = setTimeout(timeoutFunction, duration*1000);
}

playBtn.on('click', function(e) {
  var text;

  if (!clicked) {
    techFilter = $('#filter-tasks input.tech');
    filterClear = $('#filter-tasks button.clr');

    text = 'Stop!';
    timeoutFunction();
  }

  else {
    // Trigger a click on filter clear button
    filterClear.trigger('click');
    text = 'Play!';
    clearTimeout(timeoutId);
  }

  playBtn.text(text);

  clicked = !clicked;
});
