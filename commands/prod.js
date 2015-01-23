module.exports = {

  description: 'Spawn a Lighter App in "prod" environment mode.',

  run: function () {
    require('./_spawn')('prod');
  }

};
