(function() {
  module.exports = {
    up: function(migration, DataTypes, done) {
      migration.addIndex("buy_orders", ["deleted_at"]);
      migration.addIndex("sell_orders", ["deleted_at"]);
      done();
    },
    down: function(migration, DataTypes, done) {
      migration.removeIndex("buy_orders", ["deleted_at"]);
      migration.removeIndex("sell_orders", ["deleted_at"]);
      done();
    }
  };

}).call(this);
