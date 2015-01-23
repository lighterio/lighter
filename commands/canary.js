module.exports = {

  description: 'Spawn a Lighter App in "canary" environment mode.',

  run: function () {
    require('./_spawn')('canary');
  }

};
