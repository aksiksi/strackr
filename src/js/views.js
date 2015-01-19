require('./data.js');

// Create close method for all Backbone Views
Backbone.View.prototype.close = function() {
  this.remove();
  this.unbind();

  // Manually implemented on each View
  if (this.onClose)
    this.onClose();
}

// Helper to set selected value in dropdown for edit-task-view
Handlebars.registerHelper('selectedPriority', function(p, options) {
  var ps = ['Low', 'Medium', 'High'];
  var out = '';

  for (i = 0; i < ps.length; i++) {
    var opt = {priority: ps[i]};

    if (p == ps[i])
      opt.yes = true;
    else
      opt.yes = false;

    out += options.fn(opt);
  }

  return out;
});

Handlebars.registerHelper('selectedTech', function(t, options) {
  var out = '';
  var ts = app.Data.techs;

  for (i = 0; i < ts.length; i++) {
    var opt = {tech: ts[i]['Technician']};

    if (t == ts[i]['Technician'])
      opt.yes = true;
    else
      opt.yes = false;
    out += options.fn(opt);
  }

  return out;
});

Handlebars.registerHelper('selectedModule', function(m, options) {
  var ms = app.Data.modules;
  var out = '';

  for (i = 0; i < ms.length; i++) {
    var opt = {module: ms[i]};

    if (m == ms[i])
      opt.yes = true;
    else
      opt.yes = false;

    out += options.fn(opt);
  }

  return out;
});

app.Views.AddTaskView = Backbone.View.extend({
  tagName: 'form',
  className: 'form-inline add-task-form',

  template: Handlebars.compile($('#add-task-template').html()),

  events: {
    'click .add': 'addTask',
    'change .tech': 'updateModule',
    'keypress .task, .time_required, .tech, .module, .priority': 'addOnEnter'
  },

  render: function() {
    var rendered = this.template({modules: app.Data.modules, techs: app.Data.techs});
    this.$el.html(rendered);

    // Store repeatedly used jQuery objects
    this.module = this.$el.find('.module');
    this.technician = this.$el.find('.tech');
    this.task = this.$el.find('.task');
    this.priority = this.$el.find('.priority');
    this.time_required = this.$el.find('.time_required');

    return this;
  },

  addOnEnter: function(e) {
    if (e.keyCode == 13)
      this.addTask();
  },

  addTask: function() {
    var opt = {
      module: this.module.val(),
      technician: this.technician.val(),
      task: this.task.val(),
      priority: this.priority.val(),
      time_required: this.time_required.val()
    };

    // Add model to collection and save to DB
    this.collection.create(opt);

    this.clearInputs();
  },

  clearInputs: function() {
    this.task.val('');
    this.priority.val('Low');
    this.time_required.val('');
  },

  updateModule: function() {
    var tech = this.technician.val();

    // Update module value whenever tech is changed
    _.each(app.Data.techs, function(t) {
      if (t.Technician == tech) {
        this.module.val(t.Team);
      }
    }, this);
  }
});

app.Views.SortTaskView = Backbone.View.extend({
  tagName: 'div',
  className: 'sort form-inline',

  template: Handlebars.compile($('#sort-template').html()),

  events: {
    'click input': 'updateSort'
  },

  render: function() {
    var rendered = this.template({});
    this.$el.html(rendered);

    return this;
  },

  updateSort: function() {
    var s = this.$el.find('input[type=radio]:checked').val();
    this.collection.setComparator(s);
  }
});

app.Views.TaskView = Backbone.View.extend({
  tagName: 'tr',

  template: Handlebars.compile($('#task-template').html()),
  editModeTemplate: Handlebars.compile($('#edit-task-template').html()),

  events: {
    'click .edit': 'renderEdit',
    'click .remove': 'removeTask',
    'click .back': 'render',
    'click .update': 'updateTask',
    'click .completed': 'toggleCompleted'
  },

  render: function() {
    var rendered = this.template(this.model.toJSON());
    this.$el.html(rendered);

    return this;
  },

  renderEdit: function() {
    var rendered = this.editModeTemplate(this.model.toJSON());
    this.$el.html(rendered);

    return this;
  },

  updateTask: function() {
    var opt = {
      module: this.$el.find('.module').val(),
      technician: this.$el.find('.tech').val(),
      task: this.$el.find('.task').val(),
      priority: this.$el.find('.priority').val(),
      completed: this.$el.find('.completed-editing').prop('checked'),
      time_required: this.$el.find('.time_required').val()
    };

    this.model.save(opt);

    this.render();
  },

  toggleCompleted: function() {
    this.model.toggleCompleted();
  },

  removeTask: function() {
    this.model.destroy();
  }
});

app.Views.FilterTaskView = Backbone.View.extend({
  tagName: 'div',
  className: 'form-inline filter',

  template: Handlebars.compile($('#filter-template').html()),

  events: {
    'keyup .module, .tech, .priority, .task': 'updateFilters',
    'click .clr': 'clearInputs'
  },

  render: function() {
    var rendered = this.template();
    this.$el.html(rendered);

    // Save for reuse
    this.module = this.$el.find('.module');
    this.technician = this.$el.find('.tech');
    this.priority = this.$el.find('.priority');
    this.task = this.$el.find('.task');

    return this;
  },

  updateFilters: function() {
    var opt = {
      module: this.module.val(),
      technician: this.technician.val(),
      priority: this.priority.val(),
      task: this.task.val()
    };

    // Remove any keys with empty values
    _.each(_.pairs(opt), function(p) {
      var k = p[0];
      var v = p[1];

      if (_.isEmpty(v))
        delete opt[k];
    });

    this.collection.updateFilters(opt);
  },

  clearInputs: function() {
    this.$el.find('.module').val('');
    this.$el.find('.tech').val('');
    this.$el.find('.priority').val('');
    this.$el.find('.task').val('');

    this.updateFilters({});
  }
});

app.Views.TasksView = Backbone.View.extend({
  id: 'tasks-view',

  template: Handlebars.compile($('#tasks-view-template').html()),

  className: 'col-md-12',

  events: {
    'click a': 'changePage',
  },

  page: 1,
  totalPages: 1,
  tasksPerPage: 9,
  pagesToShow: 5,

  initialize: function() {
    this.childViews = [];

    this.listenTo(this.collection, 'sort', this.render);
    this.listenTo(this.collection, 'destroy', this.removeTask);
  },

  render: function(collection, options) {
    // Remove any child views on re-render
    if (this.childViews.length > 0)
      this.onClose();

    // Compute number of pages needed to display results
    this.totalPages = Math.ceil(this.collection.length / this.tasksPerPage);

    // Get pages as array of objects
    var pages = this.getPages();

    // Render template
    var rendered = this.template({pages: pages});
    this.$el.html(rendered);

    this.table = this.$el.find('.table');

    // Render individual tasks
    this.addTasks(this.collection);

    return this;
  },

  addTask: function(task) {
    // Create new view for model, push onto childViews, finally add to view
    var v = new app.Views.TaskView({model: task});
    this.childViews.push(v);
    this.table.find('tbody').append(v.render().el);
  },

  addTasks: function(tasks) {
    // Take only tasks needed for current page
    var tasksForPage = tasks.slice((this.page-1)*this.tasksPerPage, (this.page*this.tasksPerPage));

    // Render each task
    _.each(tasksForPage, this.addTask, this);
  },

  changePage: function(e) {
    var clickedPage;

    // Update current page
    if (e.target.className == 'first')
      clickedPage = 1;
    else if (e.target.className == 'last')
      clickedPage = this.totalPages
    else
      clickedPage = parseInt(e.target.text);

    // Trigger a re-render only if page clicked is not current
    if (clickedPage != this.page) {
      this.page = clickedPage;
      this.render();
    }
  },

  getPages: function() {
    // Build pagination on render and pass to template
    var pages = [];

    for (var i = 1; i <= this.totalPages; i++) {
      pages.push({
        page: i,
        active: i == this.page
      });
    }

    // Pagination display
    var shownPages;

    if (this.totalPages > this.pagesToShow) {
      if (this.page <= 3)
        shownPages = pages.slice(0, this.pagesToShow);
      else if ((this.page + 2) <= this.totalPages)
        shownPages = pages.slice(this.page-3, this.page+3);
      else
        shownPages = pages.slice(this.totalPages-5, this.totalPages);
    }

    else
      shownPages = pages;

    return shownPages;
  },

  removeTask: function(task) {
    // Remove view of removed task
    var i;
    var v;

    for (i = 0; i < this.childViews.length; i++) {
      v = this.childViews[i];

      if (v.model == task) {
        this.childViews.splice(i, 1);
        v.close();
        break;
      }
    }
  },

  onClose: function() {
    // Remove all child views
    _.each(this.childViews, function(childView) {
      childView.close();
    });

    // Empty childViews
    this.childViews = [];
  }
});

app.Views.IndexView = Backbone.View.extend({
  template: Handlebars.compile($('#index-template').html()),

  className: 'container-fluid',

  render: function() {
    // Set view initially based on template
    var rendered = this.template({});
    this.$el.html(rendered);

    // Create a AddTaskView
    this.addTaskView = new app.Views.AddTaskView({collection: app.Tasks});

    // Create a TasksView
    this.tasksView = new app.Views.TasksView({collection: app.FilteredTasks});

    // Create both a FilterTaskView and SortTaskView
    this.filterView = new app.Views.FilterTaskView({collection: app.FilteredTasks});
    this.sortView = new app.Views.SortTaskView({collection: app.FilteredTasks});

    // Show play form
    $('#play-form').show();

    // Insert views into DOM
    this.$el.find('#add-task').append(this.addTaskView.render().el);
    this.$el.find('#tasks').append(this.tasksView.render().el);
    this.$el.find('#filter-tasks').append(this.filterView.render().el);
    this.$el.find('#sort-tasks').append(this.sortView.render().el);

    return this;
  },

  onClose: function() {
    // Close all views
    this.addTaskView.close();
    this.tasksView.close();
    this.filterView.close();
    this.sortView.close();

    $('#play-form').hide();
  }
});

app.Views.ConfigView = Backbone.View.extend({
  collection: app.Tasks,

  className: 'container-fluid',

  template: Handlebars.compile($('#config-template').html()),

  events: {
    'click .prune': 'pruneTasks',
    'change .images-dir, .techs-file': 'saveConfig',
    'change .export': 'exportTasks'
  },

  render: function() {
    var stats = this.findStats();

    var rendered = this.template({
      stats: stats,
      techs: app.Data.techs,
      techsFile: app.DefaultConfig.technicians,
    });

    this.$el.html(rendered);

    this.technician = this.$el.find('.tech');
    this.date = this.$el.find('.date');

    this.techsFile = this.$el.find('.techs-file');
    this.imagesDir = this.$el.find('.images-dir');

    this.exportFile = this.$el.find('.export');

    return this;
  },

  findStats: function() {
    // Simple stats on each technician
    var stats = _.map(app.Data.techs, function(tech) {
      var tasks = this.collection.where({technician: tech['Technician']});
      var numTasks = tasks.length;

      var completed = this.collection.where({technician: tech['Technician'], completed: true});

      var percentCompleted, avgCompletion;

      if (numTasks > 0) {
        percentCompleted = ((completed.length / numTasks) * 100).toFixed(2);

        // Find average completion time of tasks for technician using Moment.js
        if (completed.length > 0) {
          avgCompletion = moment.duration(completed.map(function(task) {
            return moment(task.get('last_modified')).diff(moment(task.get('completed_on')));
          }).reduce(function(acc, t) { return acc + t; }, 0) / completed.length).humanize();
        }

        else
          avgCompletion = 'N/A';
      }

      else {
        percentCompleted = (0).toFixed(2);
        avgCompletion = 'N/A';
      }

      return _.extend(tech, {
        all: numTasks,
        percent_completed: percentCompleted,
        avg_completion: avgCompletion
      });
    }, this);

    return stats;
  },

  pruneTasks: function() {
    var date = this.date.val();
    var technician = this.technician.val();

    var filters = {
      technician: technician != 'All' ? technician : null,
      created_on: !_.isEmpty(date) ? new Date(date) : null
    };

    // Prune everything older than 2 weeks by default
    if (_.isNull(filters.created_on))
      filters.created_on = moment().subtract(1, 'week').toDate();

    if (_.isNull(filters.technician))
      delete filters.technician

    // Update filters on collection
    app.FilteredTasks.updateFilters(filters);

    // Destroy all models that satisfy the filters
    app.FilteredTasks.destroyAll();

    // Reset everything to be hunky dory
    app.FilteredTasks.updateFilters({});

    alert('Pruned tasks for ' + technician + ' from before ' + moment(filters.created_on).format('MMM Do YY') + '.');
  },

  saveConfig: function(e) {
    var techsFile = this.techsFile.val();
    var imagesDir = this.imagesDir.val();

    if (!_.isEmpty(techsFile))
      app.Config.technicians = techsFile;

    if (!_.isEmpty(imagesDir))
      app.Config.images = imagesDir + '/';

    // Save new config
    fs.writeFileSync(app.CONFIG_DIR + 'config.json', JSON.stringify(app.Config));

    // Reload tech CSV when value changed
    if (e.target.className.indexOf('techs-file') > -1) {
      var success = loadData();

      if (success)
        alert('Technicians updated!');
    }
  },

  exportTasks: function() {
    var exportFile = this.exportFile.val();

    // if (os.platform() == 'darwin')
    //   exportFile += '.csv';

    var csvString = Papa.unparse(app.FilteredTasks.convertToCsv(), {delimiter: ','});

    if (!_.isEmpty(exportFile)) {
      try {
        fs.writeFileSync(exportFile, csvString);
        alert('Export complete!');
      }

      catch (e) {
        log.info('CSV write error, %s', e);
        alert('Cannot write CSV to selected folder.');
      }
    }
  }
});

app.Views.ImageView = Backbone.View.extend({
  className: 'container-fluid',

  template: Handlebars.compile($('#image-view-template').html()),

  events: {
    'click .start': 'loopImages',
    'click .reset': 'resetImage'
  },

  initialize: function() {
    // Load up image URIs
    var imagesDir = app.Config.images ? app.Config.images : app.DefaultConfig.images;
    var files = fs.readdirSync(imagesDir);

    // Filter out hidden files and folders, then map to append images dir
    this.images = _.map(_.filter(files, function(i) {
      return i[0] != '.';
    }), function(i) {
      return imagesDir + i;
    });

    this.numImages = this.images.length;

    this.idx = 0;
    this.changing = false;
  },

  render: function() {
    var rendered = this.template({});
    this.$el.html(rendered);

    this.image = this.$el.find('img.image');
    this.interval = this.$el.find('.interval');
    this.startBtn = this.$el.find('button.start');
    this.resetBtn = this.$el.find('button.reset');

    this.timeoutId = null;

    return this;
  },

  loopImages: function() {
    var text;

    if (this.numImages > 0) {
      if (!this.changing) {
        text = 'Stop';
        this.timeoutFunction();
      }

      else {
        text = 'Start';
        clearTimeout(this.timeoutId);
      }

      this.startBtn.text(text);

      this.changing = !this.changing;
    }
  },

  timeoutFunction: function() {
    var interval = parseInt(this.interval.val());

    if (_.isNaN(interval))
        interval = 5;

    // Change image
    this.image.attr('src', this.images[this.idx++ % this.numImages]);

    // Bind context to function since setTimeout replaces this with global object
    // Source: http://stackoverflow.com/questions/2130241/pass-correct-this-context-to-settimeout-callback
    this.timeoutId = setTimeout(_.bind(this.timeoutFunction, this), interval*1000);
  },

  resetImage: function() {
    // If currently active, trigger a click event to stop looping
    if (this.changing)
      this.startBtn.trigger('click');

    // Clear image src and interval text
    this.image.attr('src', '');
    this.interval.val('');
  },

  onClose: function() {
    // In case switched while in progress
    if (this.changing)
      clearTimeout(this.timeoutId);
  }
});
