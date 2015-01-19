require('./views.js');

var Router = Backbone.Router.extend({
  routes: {
    '': 'index',
    'config': 'config',
    'images': 'images'
  },

  index: function() {
    this.setView(app.Views.IndexView, '#app');
  },

  config: function() {
    this.setView(app.Views.ConfigView, '#app');
  },

  images: function() {
    this.setView(app.Views.ImageView, '#app');
  },

  setView: function(view, parent) {
    // If there is a view in DOM, clean it up please
    if (app.activeView != null)
      app.activeView.close();

    // Create a new view
    app.activeView = new view();

    // Render and insert into DOM
    $(parent).append(app.activeView.render().el);
  }
});

app.Router = new Router();
Backbone.history.start();
