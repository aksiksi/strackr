app.Models.Task = Backbone.Model.extend({
  defaults: function() {
    return {
      module: 'N/A',
      technician: '',
      task: '',
      priority: 'Low',
      completed: false,
      time_required: '',
      completed_on: null,
      created_on: new Date(),
      last_modified: new Date()
    };
  },

  toggleCompleted: function() {
    // Add completion date only when toggling to true
    if (!this.completed)
      this.completed_on = new Date();

    // Otherwise update last_modified and reset completion time
    else {
      this.last_modified = new Date();
      this.completed_on = null;
    }

    this.save({completed: !this.get('completed'), completed_on: this.completed_on, last_modified: this.last_modified});
  },

  sync: function (method, model, options) {
    if (method == 'create') {
      app.DB.insert(model.toJSON(), function(err, doc) {
        if (err != null)
          options.error();
        else {
          // Update model to reflect _id; write to DB as well
          doc.id = doc._id; // Hack to make isNew() happy :)
          model.save(doc);
          options.success();
        }
      });
    }

    else if (method == 'read') {
      app.DB.findOne({_id: model.get('_id')}, function(err, doc) {
        if (err != null)
          options.error();
        else {
          model.set(doc);
          options.success();
        }
      });
    }

    else if (method == 'update') {
      app.DB.update({_id: model.get('_id')}, model.toJSON(), {}, function(err, numReplaced) {
        if (err != null || numReplaced == 0)
          options.error();
        else {
          options.success();
        }
      });

    }

    else {
      app.DB.remove({_id: model.get('_id')}, {}, function(err, numRemoved) {
        if (err != null || numRemoved == 0)
          options.error();
        else {
          options.success();
          return model;
        }
      });
    }
  }
});

app.Collections.Comparators.Priority = function(model) {
  var vals = {'Low': 2, 'Medium': 1, 'High': 0};
  return vals[model.get('priority')];
};

app.Collections.Comparators.Completed = function(model) {
  if (model.get('completed'))
    return 1;
  else
    return 0;
};

app.Collections.Comparators.Date = function(m1, m2) {
  if (m1.get('created_on') > m2.get('created_on'))
    return -1;
  else if (m1.get('created_on') < m2.get('created_on'))
    return 1;
  else
    return 0;
};

app.Collections.TaskList = Backbone.Collection.extend({
  model: app.Models.Task,

  initialize: function() {
    // Whenever a model is added/removed to/from app.Tasks, update app.FilteredTasks accordingly
    this.on('sync destroy reset change', function() {
      app.FilteredTasks.updateFilters();
    });
  },
});

app.Collections.FilteredTaskList = app.Collections.TaskList.extend({
  // Override init
  initialize: function() {
    this.parent = app.Tasks;
  },

  filterAttrs: {},

  // Initially sorted by date
  comparator: app.Collections.Comparators.Date,

  // Update filters and sort
  updateFilters: function(newFilterAttrs) {
    if (!_.isUndefined(newFilterAttrs))
      this.filterAttrs = newFilterAttrs;

    var filtered;

    // If filterAttrs empty, return all
    if (_.isEmpty(this.filterAttrs))
      filtered = this.parent.models;

    // Otherwise return only the models that agree with filterAttrs
    else {
      filtered = this.parent.filter(function(task) {
        var match = _.every(Object.keys(this.filterAttrs), function(key) {
          var val = this.filterAttrs[key];

          // For string attrs find substring
          if (_.isString(val))
            return task.get(key).toLowerCase().indexOf(val.toLowerCase()) > -1;
          // For date attr check if older than filter date
          else if (_.isDate(val))
            return val > task.get(key);
          else
            return val == task.get(key);
        }, this);

        return match;
      }, this);
    }

    // Reset then sort
    this.reset(filtered);
    this.sort();
  },

  // Set comparator based on sortBy
  setComparator: function(sortBy) {
    if (!_.isUndefined(sortBy)) {
      var f;

      switch (sortBy) {
        case 'priority':
          f = app.Collections.Comparators.Priority;
          break;
        case 'completed':
          f = app.Collections.Comparators.Completed;
          break;
        case 'date':
          f = app.Collections.Comparators.Date;
      }

      // Re-sort only if new comparator
      if (f != this.comparator) {
        this.comparator = f;
        this.updateFilters();
      }
    }
  },

  convertToCsv: function() {
    // Make sure collection complete and sorted by date
    this.updateFilters();
    this.setComparator('date');

    // CSV rows as array of arrays
    var out = [];

    // Single header row
    out.push(['Module', 'Task', 'Priority', 'Time Required', 'Completed?', 'Date Added', 'Completed On']);
    out.push(['']);

    // Render rows for each tech with empty line between each
    _.each(app.Data.techs, function(e) {
      var tech = e['Technician'];
      out.push([tech]);

      _.each(this.where({technician: tech}), function(task) {
        var row = [
          task.get('module'),
          task.get('task'),
          task.get('priority'),
          task.get('time_required'),
          task.get('completed') ? 'Yes' : 'No',
          moment(task.get('created_on')).format('DD-MM-YY'),
          task.get('completed_on') != null ? moment(task.get('completed_on')).format('DD-MM-YY') : 'N/A'
        ];

        out.push(row);
      }, this);

      out.push(['']);
    }, this);

    return out;
  },

  // Remove all models currently in collection and commit to DB
  destroyAll: function() {
    this.each(function(task) {
      task.destroy();
    });
  }
});

// Create an empty Collection initially
app.Tasks = new app.Collections.TaskList();

// Mirrors Tasks unless filtered
app.FilteredTasks = new app.Collections.FilteredTaskList();

// Query DB for initial model retrieval
app.DB.find({}).sort({created_on: 1}).exec(function(err, docs) {
  if (err) {
    log.info('DB query error (DB.find), %s', err);
    alert('Error reading DB. Contact: ' + ADMIN);
  }

  app.Tasks.reset(docs);
});
